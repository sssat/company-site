// news/infra/storage/S3PresignedUploadUrlAdapter.java

package com.marketstage.backend.news.infra.storage;

import com.marketstage.backend.news.application.port.out.PresignedUploadUrlPort;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;

import java.net.URL;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class S3PresignedUploadUrlAdapter implements PresignedUploadUrlPort {

    // ─────────────────────────────────────────────────────────
    // 설정값 주입 (application.yml 의 aws.* 섹션과 연결)
    // ─────────────────────────────────────────────────────────

    @Value("${aws.region:ap-northeast-2}")
    private String awsRegion;

    @Value("${aws.s3.bucket}")
    private String bucket;

    @Value("${aws.credentials.access-key:}")
    private String accessKey;

    @Value("${aws.credentials.secret-key:}")
    private String secretKey;

    @Value("${aws.cloudfront.domain:}")
    private String cloudfrontDomain;

    // 시간 주입용 
    private final Clock clock;

    // 실제 Presigned URL 을 만들어줄 S3Presigner 인스턴스
    private S3Presigner s3Presigner;

    // Region 캐시
    private Region region;

    // ─────────────────────────────────────────────────────────
    // 초기화: 설정값을 토대로 Region / S3Presigner 준비
    // ─────────────────────────────────────────────────────────
    @PostConstruct
    void init() {
        String regionStr = (awsRegion == null || awsRegion.isBlank())
                ? "ap-northeast-2"
                : awsRegion.trim();

        this.region = Region.of(regionStr);

        AwsCredentialsProvider credsProvider;
        if (accessKey != null && !accessKey.isBlank()
                && secretKey != null && !secretKey.isBlank()) {

            AwsBasicCredentials basic = AwsBasicCredentials.create(
                    accessKey.trim(),
                    secretKey.trim()
            );
            credsProvider = StaticCredentialsProvider.create(basic);
        } else {
            credsProvider = DefaultCredentialsProvider.builder().build();
        }

        this.s3Presigner = S3Presigner.builder()
                .region(this.region)
                .credentialsProvider(credsProvider)
                .build();

        if (bucket == null || bucket.isBlank()) {
            throw new IllegalStateException("aws.s3.bucket 설정이 비어 있습니다. application.yml 을 확인하세요.");
        }
    }

    // ─────────────────────────────────────────────────────────
    // 프리사인드 업로드 URL 생성 메서드 (포트 구현)
    // ─────────────────────────────────────────────────────────
    @Override
    public PresignedUpload createPresignedUploadUrl(String kind, String filename, String contentType) {
        Objects.requireNonNull(kind, "kind");
        Objects.requireNonNull(filename, "filename");

        String normalizedKind = kind.trim().toLowerCase(Locale.ROOT);
        if (!normalizedKind.equals("thumbnail") && !normalizedKind.equals("content")) {
            throw new IllegalArgumentException("지원하지 않는 kind 입니다. (thumbnail | content 만 허용)");
        }

        String safeFilename = sanitizeFilename(filename);
        String finalContentType = (contentType == null || contentType.isBlank())
                ? guessContentTypeFromFilename(safeFilename)
                : contentType.trim();

        String key = buildObjectKey(normalizedKind, safeFilename);

        // S3 PutObjectRequest 정의
        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucket.trim())
                .key(key)
                .contentType(finalContentType)
                .build();

        // Django 코드와 동일하게 15분(900초) 유효기간으로 설정
        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(15))
                .putObjectRequest(putObjectRequest)
                .build();

        // Presigned PUT URL 생성
        PresignedPutObjectRequest presigned = s3Presigner.presignPutObject(presignRequest);
        URL url = presigned.url();
        String uploadUrl = url.toExternalForm();

        // 업로드 후 접근 가능한 public URL 생성 (CloudFront > S3 순)
        String publicUrl = buildPublicUrl(key);

        return new PresignedUpload(
                uploadUrl,
                key,
                publicUrl,
                finalContentType
        );
    }

    // ─────────────────────────────────────────────────────────
    // 헬퍼: kind + 날짜 + UUID + 확장자로 S3 객체 키 생성
    // ─────────────────────────────────────────────────────────
    private String buildObjectKey(String kind, String filename) {
        // 날짜 경로 (예: 2025/11/13)
        LocalDateTime now = LocalDateTime.now(clock);
        String datePath = now.format(DateTimeFormatter.ofPattern("yyyy/MM/dd", Locale.ROOT));

        // 확장자 추출
        String ext = "";
        int dotIdx = filename.lastIndexOf('.');
        if (dotIdx >= 0 && dotIdx < filename.length() - 1) {
            ext = filename.substring(dotIdx + 1).toLowerCase(Locale.ROOT);
        }

        String uuid = UUID.randomUUID().toString().replace("-", "");
        String baseName = uuid;
        if (!ext.isEmpty()) {
            baseName = baseName + "." + ext;
        }

        String prefix;
        if (kind.equals("thumbnail")) {
            prefix = "news-thumbnail";
        } else {
            // kind == "content"
            prefix = "news-content-img";
        }

        // 최종 키 예: news-thumbnail/2025/11/13/uuid.png
        return prefix + "/" + datePath + "/" + baseName;
    }

    // ─────────────────────────────────────────────────────────
    // 헬퍼: 파일명 정리 (경로 제거, 공백 제거)
    // ─────────────────────────────────────────────────────────
    private static String sanitizeFilename(String filename) {
        String f = filename.trim().replace("\\", "/");
        int slashIdx = f.lastIndexOf('/');
        if (slashIdx >= 0 && slashIdx < f.length() - 1) {
            f = f.substring(slashIdx + 1);
        }
        if (f.isEmpty()) {
            return "file";
        }
        return f;
    }

    // ─────────────────────────────────────────────────────────
    // 헬퍼: 파일 확장자를 보고 대략적인 MIME 타입 추론
    // ─────────────────────────────────────────────────────────
    private static String guessContentTypeFromFilename(String filename) {
        String lower = filename.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
            return "image/jpeg";
        }
        if (lower.endsWith(".png")) {
            return "image/png";
        }
        if (lower.endsWith(".gif")) {
            return "image/gif";
        }
        if (lower.endsWith(".webp")) {
            return "image/webp";
        }
        // 기본값
        return "application/octet-stream";
    }

    // ─────────────────────────────────────────────────────────
    // 헬퍼: CloudFront 도메인이 있으면 CloudFront URL, 없으면 S3 URL 생성
    // ─────────────────────────────────────────────────────────
    private String buildPublicUrl(String key) {
        String trimmedKey = key;
        while (trimmedKey.startsWith("/")) {
            trimmedKey = trimmedKey.substring(1);
        }

        String cdn = (cloudfrontDomain == null) ? "" : cloudfrontDomain.trim();
        if (!cdn.isEmpty()) {
            String scheme = cdn.startsWith("http") ? "" : "https://";
            return scheme + cdn + "/" + trimmedKey;
        }

        String regionId = (awsRegion == null || awsRegion.isBlank())
                ? "ap-northeast-2"
                : awsRegion.trim();

        return "https://" + bucket.trim() + ".s3." + regionId + ".amazonaws.com/" + trimmedKey;
    }
}
