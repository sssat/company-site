// news/application/port/in/NewsUseCase.java

package com.marketstage.backend.news.application.port.in;

import java.time.LocalDateTime;
import java.util.List;

public interface NewsUseCase {

    // ─────────────────────────────────────────────────────────
    // 공통 상수 (카테고리, 업로드 kind 등)
    // ─────────────────────────────────────────────────────────

    // 1. 카테고리 문자열 매핑
    // DB 안에서는 숫자(0/1/2)로 저장하고, API 바깥으로는 영어 문자열("ALL"/"INTERNAL"/"EXTERNAL")로 보여주기 위한 상수
    String CATEGORY_ALL = "ALL";
    String CATEGORY_INTERNAL = "INTERNAL";
    String CATEGORY_EXTERNAL = "EXTERNAL";

    // 2. 프리사인드 업로드 URL kind 값
    // 프리사인드 URL: 백엔드가 미리 비밀키로 서명해 둔, 제한된 권한/시간 동안만 유효한 S3 업로드/다운로드용 링크
    // 프론트는 이 링크만 받아서 직접 S3에 PUT/GET 할 수 있고, 실제 AWS 키는 백엔드만 알고 있음
    
    // 썸네일 업로드용 presigned URL 만들 때 쓰는 kind 값
    String UPLOAD_KIND_THUMBNAIL = "thumbnail";   // kind == "thumbnail" 이면 -> news-thumbnail/YYYY/MM/DD/... 이런 키로 저장

    // 본문 이미지 업로드용 presigned URL 만들 때 쓰는 kind 값
    String UPLOAD_KIND_CONTENT = "content";       // kind == "content" 면 -> news-content-img/YYYY/MM/DD/... 이런 키로 저장

    // ─────────────────────────────────────────────────────────
    // record DTO들 (입출력 모델)
    // ─────────────────────────────────────────────────────────

    // 1. 뉴스 목록 조회 요청 값 (쿼리 파라미터에 해당)
    record NewsListQuery(
            String q,
            String category,
            int page,
            int size,
            String sort
    ) {}

    // 2. 뉴스 목록의 한 줄 요약 아이템
    record NewsSummary(
            Integer newsSeq,
            String title,
            String excerpt,
            String badge,
            String thumbnailUrl,
            String category,         // "ALL" | "INTERNAL" | "EXTERNAL"
            LocalDateTime publishedAt
    ) {}

    // 3. 뉴스 목록 조회 결과
    record NewsListResult(
            List<NewsSummary> items,
            int page,
            int size,
            long totalCount,
            int totalPages,
            String message           // 보통 "OK"
    ) {}

    // 4. 뉴스 상세 조회 요청 값
    record NewsDetailQuery(
            Integer newsSeq          // path variable 로 들어오는 NEWS_SEQ
    ) {}

    // 5. 뉴스 상세 조회 결과
    record NewsDetailResult(
            Integer newsSeq,
            String slug,
            String title,
            String badge,
            String category,         // "ALL" | "INTERNAL" | "EXTERNAL"
            String imageUrl,
            String thumbnailUrl,
            LocalDateTime publishedAt,
            LocalDateTime updatedAt,
            String excerpt,
            List<String> body,
            String message           // 보통 "OK"
    ) {}

    // 6. 뉴스 생성 요청 값
    record NewsCreateCommand(
            Integer actorUserSeq,    // 작성자 PK 
            String title,
            String excerpt,
            String content,
            String category,         // "ALL" | "INTERNAL" | "EXTERNAL"
            String badge,
            String thumbnailUrl,
            String imageUrl,
            String imageKey          // presigned 업로드 후 전달되는 key (없을 수도 있음)
    ) {}

    // 7. 뉴스 생성 결과
    record NewsCreateResult(
            Integer newsSeq,
            LocalDateTime publishedAt,
            String message          
    ) {}

    // 8. 뉴스 수정 요청 값
    record NewsUpdateCommand(
            Integer actorUserSeq,    // 수정자 PK
            Integer newsSeq,         // 수정 대상 뉴스 PK
            String title,
            String excerpt,
            String content,
            String category,         // "ALL" | "INTERNAL" | "EXTERNAL"
            String badge,
            String thumbnailUrl,
            String imageUrl,
            Boolean removeThumbnail,
            Boolean removeImage,
            String imageKey          // thumbnail 교체 등에 사용
    ) {}

    // 9. 뉴스 수정 결과
    record NewsUpdateResult(
            Integer newsSeq,
            LocalDateTime updatedAt,
            String message          
    ) {}

    // 10. 뉴스 삭제 요청 값
    record NewsDeleteCommand(
            Integer actorUserSeq,    // 삭제자 PK
            Integer newsSeq          // 삭제 대상 뉴스 PK
    ) {}

    // 11. 프리사인드 업로드 URL 발급 요청 값
    // 프리사인드 업로드 URL 하나 만들어달라는 request body 값을 한 군데에 모아놓은 커맨드
    // kind / filename / contentType: 클라이언트가 request body로 보내는 값
    // actorUserSeq: 인증된 사용자 정보에서 꺼낸 PK (body에는 안 들어감)
    record CreatePresignedUploadUrlCommand(
            Integer actorUserSeq,    // 요청자 PK (관리자 권한 확인 등에 사용)
            String kind,             // "thumbnail" | "content"
            String filename,         // 원본 파일명 (logo.png 같은 거)
            String contentType       // S3에 업로드할 "그 이미지 파일"의 MIME 타입 (html 인지, json 인지, png 인지, jpeg 인지, mp4 인지 ....)
    ) {}

    // 12. 프리사인드 업로드 URL 발급 결과
    // S3 프리사인드 URL을 다 만들었을 때, 클라이언트에게 response body로 돌려줘야 할 값들의 묶음
    record PresignedUploadUrlResult(
            String uploadUrl,      // 프론트가 직접 PUT 할 S3 프리사인드 URL -> 이 URL로 파일을 업로드하면 됨 (15분 제한 같은 거 있음)
            String key,            // S3 객체 키 (예: news-thumbnail/2025/11/14/uuid-파일명.png)
            String publicUrl,      // 업로드가 끝난 후, 이미지를 브라우저에서 볼 때 사용할 공개 URL
            String contentType,    // S3에 업로드할 "그 이미지 파일"의 MIME 타입 (html 인지, json 인지, png 인지, jpeg 인지, mp4 인지 ....)
            String message         // "OK" 또는 "업로드 URL 생성에 실패했습니다." 같은 메시지
    ) {}

    // ─────────────────────────────────────────────────────────
    // 유즈케이스 메서드 시그니처 (무엇을 할지 정의)
    // ─────────────────────────────────────────────────────────

    // 1. 뉴스 목록 조회
    NewsListResult listNews(NewsListQuery query);

    // 2. 뉴스 상세 조회
    NewsDetailResult getNewsDetail(NewsDetailQuery query);

    // 3. 뉴스 생성 (관리자)
    NewsCreateResult createNews(NewsCreateCommand command);

    // 4. 뉴스 수정 (관리자, 부분 수정)
    NewsUpdateResult updateNews(NewsUpdateCommand command);

    // 5. 뉴스 삭제 (관리자)
    void deleteNews(NewsDeleteCommand command);

    // 6. 프리사인드 업로드 URL 발급 (관리자)
    PresignedUploadUrlResult createPresignedUploadUrl(CreatePresignedUploadUrlCommand command);
}
