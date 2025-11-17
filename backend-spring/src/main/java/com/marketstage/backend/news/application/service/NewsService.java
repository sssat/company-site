// news/application/service/NewsService.java
// 파이썬 장고로 치면 news/views.py + news/serializers.py 에 들어있던
// "뉴스 목록/상세/생성/수정/삭제 + 프리사인드 URL 발급" 비즈니스 로직을 하나의 서비스 계층 클래스로 모아 구현한 파일
// AccountsService.java 가 AccountsUseCase 를 구현하듯, 이 클래스는 NewsUseCase 를 구현한다.

package com.marketstage.backend.news.application.service;

import com.marketstage.backend.accounts.application.port.out.UserRepository;
import com.marketstage.backend.accounts.domain.model.User;
import com.marketstage.backend.common.exception.NotFoundException;
import com.marketstage.backend.news.application.port.in.NewsUseCase;
import com.marketstage.backend.news.application.port.out.NewsPostHistoryRepository;
import com.marketstage.backend.news.application.port.out.NewsPostRepository;
import com.marketstage.backend.news.application.port.out.PresignedUploadUrlPort;
import com.marketstage.backend.news.domain.model.NewsPost;
import com.marketstage.backend.news.domain.model.NewsPostHistory;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Transactional
@RequiredArgsConstructor
public class NewsService implements NewsUseCase {

    // ─────────────────────────────────────────────────────────
    // 의존성 주입 인스턴스 변수들 (아웃바운드 포트 + 공용 빈)
    // ─────────────────────────────────────────────────────────

    // 뉴스 퍼시스턴스 아웃바운드 포트
    private final NewsPostRepository newsPostRepository;

    // 삭제 이력 퍼시스턴스 아웃바운드 포트
    private final NewsPostHistoryRepository newsPostHistoryRepository;

    // 프리사인드 업로드 URL 발급용 아웃바운드 포트
    private final PresignedUploadUrlPort presignedUploadUrlPort;

    // 시간 주입용 (테스트 시 고정 Clock 으로 교체 가능)
    private final Clock clock;

    // 관리자 권한 확인용 (User 조회)
    private final UserRepository userRepository;

    @Value("${aws.region:ap-northeast-2}")
    private String awsRegion;

    @Value("${aws.s3.bucket:}")
    private String awsS3Bucket;

    @Value("${aws.cloudfront.domain:}")
    private String cloudfrontDomain;

    private static final String NEWS_THUMB_PREFIX = "news-thumbnail/";

    private static final Pattern IMG_SRC_PATTERN =
            Pattern.compile("<img[^>]+src=[\"']([^\"']+)[\"']", Pattern.CASE_INSENSITIVE);

    // ─────────────────────────────────────────────────────────
    // 1) listNews: 뉴스 목록 조회 비즈니스 로직 함수 구현
    // ─────────────────────────────────────────────────────────
    @Override
    @Transactional(readOnly = true)
    public NewsListResult listNews(NewsListQuery query) {
        Objects.requireNonNull(query, "query");

        String q        = safe(query.q());
        String category = safe(query.category());
        String sortRaw  = safe(query.sort());

        int page = query.page() <= 0 ? 1 : query.page();
        int size = query.size() <= 0 ? 6 : Math.min(query.size(), 24);

        // 정렬 파라미터 정규화
        String sort = normalizeSort(sortRaw);
        boolean sortDesc = sort.startsWith("-");
        String sortProperty = "publishedAt";

        // 카테고리 문자열 -> 내부 int 코드
        Integer categoryInt = null;
        boolean filterByCategory = false;
        if (!category.isEmpty()) {
            int ci = categoryStrToInt(category);  // ALL/INTERNAL/EXTERNAL 외면 예외
            if (!NewsUseCase.CATEGORY_ALL.equalsIgnoreCase(category)) {
                categoryInt = ci;
                filterByCategory = true;
            }
        }

        int offset = (page - 1) * size;

        long totalCount = newsPostRepository.countByFilter(q, filterByCategory ? categoryInt : null);
        List<NewsPost> rows = newsPostRepository.findByFilter(
                q,
                filterByCategory ? categoryInt : null,
                sortProperty,
                sortDesc,
                offset,
                size
        );

        int totalPages = (size == 0 || totalCount == 0)
                ? 0
                : (int) Math.ceil((double) totalCount / size);

        // 도메인 엔티티 -> 유즈케이스 DTO(NewsSummary)로 매핑
        List<NewsSummary> items = new ArrayList<>(rows.size());
        for (NewsPost post : rows) {
            items.add(new NewsSummary(
                    post.getNewsSeq(),
                    safe(post.getTitle()),
                    safe(post.getExcerpt()),
                    safe(post.getBadge()),
                    safe(post.getThumbnailUrl()),
                    categoryIntToStr(post.getCategory()),
                    post.getPublishedAt()
            ));
        }

        return new NewsListResult(items, page, size, totalCount, totalPages, "OK");
    }

    // ─────────────────────────────────────────────────────────
    // 2) getNewsDetail: 뉴스 단건 상세 조회 비즈니스 로직 함수 구현
    // ─────────────────────────────────────────────────────────
    @Override
    @Transactional(readOnly = true)
    public NewsDetailResult getNewsDetail(NewsDetailQuery query) {
        Objects.requireNonNull(query, "query");
        Integer newsSeq = query.newsSeq();

        if (newsSeq == null || newsSeq <= 0) {
            throw new IllegalArgumentException("newsSeq 는 1 이상 정수여야 합니다.");
        }

        NewsPost post = newsPostRepository.findById(newsSeq)
                .orElseThrow(() -> new NotFoundException("존재하지 않는 뉴스입니다."));

        String categoryStr = categoryIntToStr(post.getCategory());
        String slug        = slugify(post.getTitle());
        List<String> body  = splitContentToParagraphs(post.getContent());

        return new NewsDetailResult(
                post.getNewsSeq(),
                slug,
                safe(post.getTitle()),
                safe(post.getBadge()),
                categoryStr,
                safe(post.getImageUrl()),
                safe(post.getThumbnailUrl()),
                post.getPublishedAt(),
                post.getUpdatedAt(),
                safe(post.getExcerpt()),
                body,
                "OK"
        );
    }

    // ─────────────────────────────────────────────────────────
    // 3) createNews: 뉴스 생성 비즈니스 로직 함수 구현
    // ─────────────────────────────────────────────────────────
    @Override
    public NewsCreateResult createNews(NewsCreateCommand cmd) {
        Objects.requireNonNull(cmd, "cmd");

        // ★ 관리자 확인
        User author = requireAdmin(cmd.actorUserSeq());

        ensureNotBlank(cmd.title(),    "title");
        ensureNotBlank(cmd.excerpt(),  "excerpt");
        ensureNotBlank(cmd.content(),  "content");
        ensureNotBlank(cmd.category(), "category");
        ensureNotBlank(cmd.badge(),    "badge");

        // 길이 검증 (엔티티 @Column length / 장고 max_length 와 맞춤)
        String title   = cmd.title().trim();
        String excerpt = cmd.excerpt().trim();
        String badge   = cmd.badge().trim();

        ensureMaxLength(title,   200, "제목은 최대 200자까지 입력할 수 있습니다.");
        ensureMaxLength(excerpt, 500, "요약(excerpt)은 최대 500자까지 입력할 수 있습니다.");
        ensureMaxLength(badge,    50, "배지는 최대 50자까지 입력할 수 있습니다.");

        int categoryInt = categoryStrToInt(cmd.category());

        String thumbnailUrl = safe(cmd.thumbnailUrl());
        String imageUrl     = safe(cmd.imageUrl());
        String content      = cmd.content();  // HTML 그대로
        String imageKey     = safe(cmd.imageKey());

        // URL 길이 검증 (nullable 필드)
        if (!thumbnailUrl.isEmpty()) {
            ensureMaxLength(thumbnailUrl, 255, "썸네일 URL은 최대 255자까지 입력할 수 있습니다.");
        }
        if (!imageUrl.isEmpty()) {
            ensureMaxLength(imageUrl, 255, "이미지 URL은 최대 255자까지 입력할 수 있습니다.");
        }

        // image_key 가 news-thumbnail/ 프리픽스로 들어오면 썸네일 URL을 강제로 세팅
        if (!imageKey.isEmpty() && isThumbKey(imageKey)) {
            thumbnailUrl = publicUrlFromKey(imageKey);
            ensureMaxLength(thumbnailUrl, 255, "썸네일 URL은 최대 255자까지 입력할 수 있습니다.");
        }

        // image_url 이 비어 있으면 본문에서 첫 이미지 추출
        if (isBlank(imageUrl)) {
            String candidate = deriveImageUrlFromContent(content);
            if (candidate != null) {
                imageUrl = candidate;
                ensureMaxLength(imageUrl, 255, "이미지 URL은 최대 255자까지 입력할 수 있습니다.");
                content = stripFirstImgWithSrc(content, candidate);
            }
        }

        LocalDateTime now = LocalDateTime.now(clock);

        NewsPost post = NewsPost.builder()
                .publishedBy(author)     // 기존 buildUserRef 대신 실제 User 사용
                .title(title)
                .excerpt(excerpt)
                .content(content)
                .category((short) categoryInt)
                .badge(badge)
                .thumbnailUrl(isBlank(thumbnailUrl) ? null : thumbnailUrl)
                .imageUrl(isBlank(imageUrl) ? null : imageUrl)
                .publishedAt(now)
                .build();

        NewsPost saved = newsPostRepository.save(post);
        LocalDateTime publishedAt = (saved.getPublishedAt() != null) ? saved.getPublishedAt() : now;

        return new NewsCreateResult(saved.getNewsSeq(), publishedAt, "뉴스가 등록되었습니다.");
    }

    // ─────────────────────────────────────────────────────────
    // 4) updateNews: 뉴스 수정 비즈니스 로직 함수 구현
    // ─────────────────────────────────────────────────────────
    @Override
    public NewsUpdateResult updateNews(NewsUpdateCommand cmd) {
        Objects.requireNonNull(cmd, "cmd");
        Objects.requireNonNull(cmd.newsSeq(), "newsSeq");

        // ★ 관리자 확인
        User actor = requireAdmin(cmd.actorUserSeq());

        NewsPost post = newsPostRepository.findById(cmd.newsSeq())
                .orElseThrow(() -> new NotFoundException("존재하지 않는 뉴스입니다."));

        // 1) 제거 플래그 우선 처리
        if (Boolean.TRUE.equals(cmd.removeThumbnail())) {
            post.setThumbnailUrl(null);
        }
        if (Boolean.TRUE.equals(cmd.removeImage())) {
            post.setImageUrl(null);
        }

        // 2) 카테고리 문자열이 들어왔다면 int 코드로 교체
        if (cmd.category() != null) {
            int categoryInt = categoryStrToInt(cmd.category());
            post.setCategory((short) categoryInt);
        }

        // 3) image_key 가 news-thumbnail/ 이면 썸네일 교체
        String imageKey = safe(cmd.imageKey());
        if (!imageKey.isEmpty() && isThumbKey(imageKey)) {
            String thumbUrl = publicUrlFromKey(imageKey);
            ensureMaxLength(thumbUrl, 255, "썸네일 URL은 최대 255자까지 입력할 수 있습니다.");
            post.setThumbnailUrl(thumbUrl);
        } else if (cmd.thumbnailUrl() != null) {
            String t = cmd.thumbnailUrl().trim();
            if (!t.isEmpty()) {
                ensureMaxLength(t, 255, "썸네일 URL은 최대 255자까지 입력할 수 있습니다.");
                post.setThumbnailUrl(t);
            } else {
                post.setThumbnailUrl(null);
            }
        }

        // 4) content / image_url 처리
        if (cmd.content() != null) {
            String newBody = cmd.content();
            String imageUrl = cmd.imageUrl();

            if (imageUrl == null || imageUrl.isBlank()) {
                String cand = deriveImageUrlFromContent(newBody);
                if (cand != null) {
                    ensureMaxLength(cand, 255, "이미지 URL은 최대 255자까지 입력할 수 있습니다.");
                    post.setImageUrl(cand);
                    newBody = stripFirstImgWithSrc(newBody, cand);
                } else {
                    post.setImageUrl(null);
                }
            } else {
                String trimmed = imageUrl.trim();
                if (!trimmed.isEmpty()) {
                    ensureMaxLength(trimmed, 255, "이미지 URL은 최대 255자까지 입력할 수 있습니다.");
                    post.setImageUrl(trimmed);
                } else {
                    post.setImageUrl(null);
                }
            }
            post.setContent(newBody);
        } else if (cmd.imageUrl() != null) {
            String img = cmd.imageUrl().trim();
            if (!img.isEmpty()) {
                ensureMaxLength(img, 255, "이미지 URL은 최대 255자까지 입력할 수 있습니다.");
                post.setImageUrl(img);
            } else {
                post.setImageUrl(null);
            }
        }

        // 5) 제목/요약/배지 부분 수정
        if (cmd.title() != null) {
            String title = cmd.title().trim();
            if (title.isEmpty()) {
                throw new IllegalArgumentException("제목은 빈 값일 수 없습니다.");
            }
            ensureMaxLength(title, 200, "제목은 최대 200자까지 입력할 수 있습니다.");
            post.setTitle(title);
        }

        if (cmd.excerpt() != null) {
            String excerpt = cmd.excerpt().trim();
            if (excerpt.isEmpty()) {
                throw new IllegalArgumentException("요약(excerpt)은 빈 값일 수 없습니다.");
            }
            ensureMaxLength(excerpt, 500, "요약(excerpt)은 최대 500자까지 입력할 수 있습니다.");
            post.setExcerpt(excerpt);
        }

        if (cmd.badge() != null) {
            String badge = cmd.badge().trim();
            if (badge.isEmpty()) {
                throw new IllegalArgumentException("배지는 빈 값일 수 없습니다.");
            }
            ensureMaxLength(badge, 50, "배지는 최대 50자까지 입력할 수 있습니다.");
            post.setBadge(badge);
        }

        // 6) 수정자/수정 시간 갱신
        LocalDateTime now = LocalDateTime.now(clock);
        post.setUpdatedAt(now);
        post.setUpdatedBy(actor);   // buildUserRef 대신 actor

        NewsPost saved = newsPostRepository.save(post);

        return new NewsUpdateResult(saved.getNewsSeq(), saved.getUpdatedAt(), "뉴스가 수정되었습니다.");
    }

    // ─────────────────────────────────────────────────────────
    // 5) deleteNews: 뉴스 삭제 비즈니스 로직 함수 구현
    // ─────────────────────────────────────────────────────────
    @Override
    public void deleteNews(NewsDeleteCommand cmd) {
        Objects.requireNonNull(cmd, "cmd");
        Objects.requireNonNull(cmd.newsSeq(), "newsSeq");

        // ★ 관리자 확인
        User actor = requireAdmin(cmd.actorUserSeq());

        NewsPost post = newsPostRepository.findById(cmd.newsSeq())
                .orElseThrow(() -> new NotFoundException("존재하지 않는 뉴스입니다."));

        // 1) 삭제 이력 저장 (실패해도 본 삭제는 계속)
        try {
            NewsPostHistory history = NewsPostHistory.builder()
                    // .news(post)  // FK 연관관계는 사용하지 않고, 스냅샷 컬럼만 사용
                    .newsSeqSnapshot(post.getNewsSeq())          // 스냅샷용 news_seq
                    .titleSnapshot(post.getTitle())              // 스냅샷용 title
                    .deletedBy(actor)                            // 삭제자 User
                    .deletedAt(LocalDateTime.now(clock))         // 삭제 시각
                    .build();

            newsPostHistoryRepository.save(history);
        } catch (Exception e) {
            // 여기서는 삭제 이력 실패해도 실제 삭제는 계속 진행
            // log.warn("뉴스 삭제 이력 저장 실패 (newsSeq={})", cmd.newsSeq(), e);
        }

        // 2) 실제 뉴스 삭제
        newsPostRepository.delete(post);
    }

    // ─────────────────────────────────────────────────────────
    // 6) createPresignedUploadUrl: 프리사인드 업로드 URL 발급 비즈니스 로직 함수 구현
    // ─────────────────────────────────────────────────────────
    @Override
    @Transactional(readOnly = true)
    public PresignedUploadUrlResult createPresignedUploadUrl(CreatePresignedUploadUrlCommand cmd) {
        Objects.requireNonNull(cmd, "cmd");

        // ★ 관리자 확인 (리턴값은 사용하지 않아도 됨)
        requireAdmin(cmd.actorUserSeq());

        String kind        = safe(cmd.kind()).toLowerCase(Locale.ROOT);
        String filename    = safe(cmd.filename());
        String contentType = safe(cmd.contentType());

        if (kind.isEmpty()) {
            throw new IllegalArgumentException("kind 는 필수입니다.");
        }
        if (!kind.equals("thumbnail") && !kind.equals("content")) {
            throw new IllegalArgumentException("kind 는 thumbnail 또는 content 여야 합니다.");
        }
        if (filename.isEmpty()) {
            throw new IllegalArgumentException("filename 은 빈 값일 수 없습니다.");
        }

        // 퍼시스턴스가 아닌 인프라 포트(스토리지 어댑터)에 위임
        PresignedUploadUrlPort.PresignedUpload info =
                presignedUploadUrlPort.createPresignedUploadUrl(
                        kind,
                        filename,
                        contentType.isEmpty() ? null : contentType
                );

        return new PresignedUploadUrlResult(
                info.uploadUrl(),
                info.key(),
                info.publicUrl(),
                info.contentType(),
                "OK"
        );
    }

    // ─────────────────────────────────────────────────────────
    // 헬퍼 메서드들
    // ─────────────────────────────────────────────────────────

    // 1. 필수 문자열이 null 이거나 공백뿐이면 예외를 던지는 헬퍼
    private static void ensureNotBlank(String s, String field) {
        if (s == null || s.trim().isEmpty()) {
            throw new IllegalArgumentException("필수값 누락: " + field);
        }
    }

    // 2. 문자열 최대 길이 검증 헬퍼
    private static void ensureMaxLength(String value, int max, String message) {
        if (value != null && value.length() > max) {
            throw new IllegalArgumentException(message);
        }
    }

    // 3. null 이면 빈 문자열("")로, 아니면 앞뒤 공백을 제거해서 반환하는 헬퍼
    private static String safe(String s) {
        return (s == null) ? "" : s.trim();
    }

    // 4. 문자열이 null 이거나 공백뿐인지 판단하는 헬퍼
    private static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    // 6. 카테고리 int/short -> 문자열로 변환 (0->ALL, 1->INTERNAL, 2->EXTERNAL)
    private static String categoryIntToStr(Number v) {
        if (v == null) return null;
        int i = v.intValue();
        return switch (i) {
            case 0 -> NewsUseCase.CATEGORY_ALL;
            case 1 -> NewsUseCase.CATEGORY_INTERNAL;
            case 2 -> NewsUseCase.CATEGORY_EXTERNAL;
            default -> String.valueOf(i);
        };
    }

    // 7. 카테고리 문자열 -> int 코드로 변환 (ALL/INTERNAL/EXTERNAL 외에는 예외)
    private static int categoryStrToInt(String v) {
        String upper = safe(v).toUpperCase(Locale.ROOT);
        return switch (upper) {
            case NewsUseCase.CATEGORY_ALL      -> 0;
            case NewsUseCase.CATEGORY_INTERNAL -> 1;
            case NewsUseCase.CATEGORY_EXTERNAL -> 2;
            default -> throw new IllegalArgumentException("유효하지 않은 카테고리입니다. (ALL|INTERNAL|EXTERNAL)");
        };
    }

    // 8. 정렬(sort) 문자열 정규화
    private static String normalizeSort(String v) {
        String s = safe(v).toLowerCase(Locale.ROOT);
        if (s.isEmpty()) {
            return "-published_at";
        }
        // 허용하는 값: "-published_at", "published_at", "published_at(desc)", "published_at(asc)"
        if (s.equals("-published_at") || s.equals("published_at(desc)")) {
            return "-published_at";
        }
        if (s.equals("published_at") || s.equals("published_at(asc)")) {
            return "published_at";
        }
        throw new IllegalArgumentException("지원하지 않는 정렬 형식입니다.");
    }

    // 9. key 가 "news-thumbnail/" 프리픽스를 가진 썸네일용 키인지 검사
    private static boolean isThumbKey(String key) {
        if (key == null) return false;
        String k = key.stripLeading();    // 앞 공백 제거
        while (k.startsWith("/")) {
            k = k.substring(1);
        }
        return k.startsWith(NEWS_THUMB_PREFIX);
    }

    // 10. S3 object key 를 실제 공개 URL 로 바꿔주는 헬퍼
    private String publicUrlFromKey(String key) {
        String trimmedKey = (key == null) ? "" : key.strip();
        while (trimmedKey.startsWith("/")) {
            trimmedKey = trimmedKey.substring(1);
        }

        String cdn = safe(cloudfrontDomain);
        if (!cdn.isEmpty()) {
            String scheme = cdn.startsWith("http") ? "" : "https://";
            return scheme + cdn + "/" + trimmedKey;
        }

        String bucket = safe(awsS3Bucket);
        String region = safe(awsRegion).isEmpty() ? "ap-northeast-2" : awsRegion;
        return "https://" + bucket + ".s3." + region + ".amazonaws.com/" + trimmedKey;
    }

    // 11. HTML 본문에서 첫 번째 <img src="..."> 의 src 값을 추출하는 헬퍼
    private static String deriveImageUrlFromContent(String html) {
        if (html == null || html.isEmpty()) return null;
        Matcher m = IMG_SRC_PATTERN.matcher(html);
        if (m.find()) {
            return m.group(1);  // 첫 번째 캡처 그룹(src 값)
        }
        return null;
    }

    // 12. HTML 본문에서 특정 src 를 가진 첫 번째 <img> 태그만 제거하는 헬퍼
    private static String stripFirstImgWithSrc(String html, String src) {
        if (html == null || html.isEmpty() || src == null || src.isEmpty()) {
            return html;
        }
        String escapedSrc = Pattern.quote(src);
        Pattern p = Pattern.compile(
                "<img\\b[^>]*src=[\"']" + escapedSrc + "[\"'][^>]*>\\s*",
                Pattern.CASE_INSENSITIVE
        );
        Matcher m = p.matcher(html);
        return m.replaceFirst(""); // 첫 한 번만 치환
    }

    // 13. content 를 \n\n 기준으로 나눠 단락(paragraph) 리스트로 만드는 헬퍼
    private static List<String> splitContentToParagraphs(String content) {
        if (content == null || content.isEmpty()) {
            return List.of();
        }
        String normalized = content.replace("\r\n", "\n");
        String[] parts = normalized.split("\\n\\n+");
        List<String> paragraphs = new ArrayList<>();
        for (String p : parts) {
            String trimmed = p.trim();
            if (!trimmed.isEmpty()) {
                paragraphs.add(trimmed);
            }
        }
        return paragraphs;
    }

    // 14. 제목(title)을 간단한 slug 문자열로 변환하는 헬퍼
    private static String slugify(String title) {
        if (title == null) return "";
        String lower = title.toLowerCase(Locale.ROOT).trim();
        String slug = lower.replaceAll("[^a-z0-9가-힣]+", "-");
        slug = slug.replaceAll("-{2,}", "-");
        slug = slug.replaceAll("^-+", "").replaceAll("-+$", "");
        return slug;
    }

    // 15. 관리자(ADMIN(1) / SUPER_ADMIN(2))만 허용하는 헬퍼
    private User requireAdmin(Integer actorUserSeq) {
        if (actorUserSeq == null) {
            throw new AuthenticationCredentialsNotFoundException("로그인이 필요합니다.");
        }

        User user = userRepository.findById(actorUserSeq)
                .orElseThrow(() ->
                        new AuthenticationCredentialsNotFoundException("로그인이 필요합니다."));

        Short gradeCode = (user.getLevel() != null)
                ? user.getLevel().getGradeCode()
                : 0;

        if (gradeCode == null || (gradeCode != 1 && gradeCode != 2)) {
            throw new SecurityException("관리자 권한이 없습니다.");
        }

        return user;
    }
}
