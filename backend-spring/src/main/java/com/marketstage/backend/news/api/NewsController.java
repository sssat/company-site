// src/main/java/com/marketstage/backend/news/api/NewsController.java

package com.marketstage.backend.news.api;

// ─────────────────────────────────────────
// DTO들 (요청/응답 그릇 역할)
// ─────────────────────────────────────────
import com.marketstage.backend.news.api.dto.NewsListDto.NewsListRequestDto;
import com.marketstage.backend.news.api.dto.NewsListDto.NewsListResponseDto;
import com.marketstage.backend.news.api.dto.NewsDetailDto.NewsDetailRequestDto;
import com.marketstage.backend.news.api.dto.NewsDetailDto.NewsDetailResponseDto;
import com.marketstage.backend.news.api.dto.NewsCreateDto.NewsCreateRequestDto;
import com.marketstage.backend.news.api.dto.NewsCreateDto.NewsCreateResponseDto;
import com.marketstage.backend.news.api.dto.NewsUpdateDto.NewsUpdateRequestDto;
import com.marketstage.backend.news.api.dto.NewsUpdateDto.NewsUpdateResponseDto;
import com.marketstage.backend.news.api.dto.NewsDeleteDto.NewsDeleteResponseDto;
import com.marketstage.backend.news.api.dto.PresignedUploadDto.PresignedUploadRequestDto;
import com.marketstage.backend.news.api.dto.PresignedUploadDto.PresignedUploadResponseDto;

// ─────────────────────────────────────────
// 애플리케이션 계층(유즈케이스)
// ─────────────────────────────────────────
import com.marketstage.backend.news.application.port.in.NewsUseCase;

// 공통 예외
import com.marketstage.backend.common.exception.NotFoundException;

// 롬복
import lombok.RequiredArgsConstructor;

// 스프링 웹/HTTP 관련
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

// 자바 표준
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class NewsController {

    // JWT 안에서 사용자 PK를 꺼낼 때 사용할 클레임 이름
    // application.yml의 app.jwt.user-id-claim 기본값과 맞춰서 "user_seq" 사용
    private static final String USER_ID_CLAIM = "user_seq";

    // 비즈니스 로직(뉴스 목록/상세/생성/수정/삭제/S3 presign)을 담당하는 유즈케이스
    // 실제 구현체는 NewsService 이지만, 여기서는 인터페이스(NewsUseCase)에만 의존한다.
    private final NewsUseCase newsUseCase;

    // ─────────────────────────────────────────
    // 1. 뉴스 목록 조회 (비로그인/로그인 모두 가능)
    // GET /api/news/?q=&category=&page=&size=&sort=
    // ─────────────────────────────────────────
    @GetMapping("/news/")
    public ResponseEntity<?> listNews(
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "category", required = false) String category,
            @RequestParam(name = "page", defaultValue = "1") int page,
            @RequestParam(name = "size", defaultValue = "6") int size,
            @RequestParam(name = "sort", required = false) String sort
    ) {
        try {
            // 1) 쿼리 파라미터 -> 요청 DTO
            NewsListRequestDto requestDto =
                    new NewsListRequestDto(q, category, page, size, sort);

            // 2) 요청 DTO -> 유즈케이스 입력 모델(NewsListQuery)
            NewsUseCase.NewsListQuery query = requestDto.toQuery();

            // 3) 비즈니스 로직 실행
            NewsUseCase.NewsListResult result = newsUseCase.listNews(query);

            // 4) 유즈케이스 결과 -> 응답 DTO
            NewsListResponseDto responseDto = NewsListResponseDto.from(result);

            return ResponseEntity.ok(responseDto);

        } catch (IllegalArgumentException ex) {
            // Django: 잘못된 쿼리 파라미터일 때 400 + {"message": "잘못된 요청입니다."}
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "잘못된 요청입니다."));
        }
    }

    // ─────────────────────────────────────────
    // 2. 뉴스 단건 상세 조회 (비로그인/로그인 모두 가능)
    // GET /api/news/{newsSeq}/
    // ─────────────────────────────────────────
    @GetMapping("/news/{newsSeq}/")
    public ResponseEntity<?> getNewsDetail(@PathVariable("newsSeq") Integer newsSeq) {
        try {
            // 1) path variable -> 요청 DTO
            NewsDetailRequestDto requestDto = new NewsDetailRequestDto(newsSeq);

            // 2) 요청 DTO -> 유즈케이스 입력 모델
            NewsUseCase.NewsDetailQuery query = requestDto.toQuery();

            // 3) 비즈니스 로직 실행
            NewsUseCase.NewsDetailResult result = newsUseCase.getNewsDetail(query);

            // 4) 응답 DTO로 변환
            NewsDetailResponseDto responseDto = NewsDetailResponseDto.from(result);
            return ResponseEntity.ok(responseDto);

        } catch (IllegalArgumentException ex) {
            // newsSeq 가 1 미만 등 잘못된 경우
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "잘못된 요청입니다."));
        } catch (NotFoundException ex) {
            // 존재하지 않는 뉴스
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", ex.getMessage()));
        }
    }

    // ─────────────────────────────────────────
    // 3. 뉴스 생성(관리자)
    // POST /api/admins/news/
    //
    // 기존: X-USER-SEQ 헤더에서 actorUserSeq 받음
    // 변경: JWT의 user_seq 클레임에서 actorUserSeq 가져옴
    // ─────────────────────────────────────────
    @PostMapping("/admins/news/")
    public ResponseEntity<?> createNews(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody NewsCreateRequestDto requestDto
    ) {
        try {
            Integer actorUserSeq = currentUserSeq(jwt);

            // 1) DTO -> 유즈케이스 입력 모델
            NewsUseCase.NewsCreateCommand command = requestDto.toCommand(actorUserSeq);

            // 2) 비즈니스 로직 실행
            NewsUseCase.NewsCreateResult result = newsUseCase.createNews(command);

            // 3) 응답 DTO 변환
            NewsCreateResponseDto responseDto = NewsCreateResponseDto.from(result);

            return ResponseEntity.status(HttpStatus.CREATED).body(responseDto);

        } catch (IllegalArgumentException ex) {
            // Django: validate 실패 시 400 + {"message": "잘못된 요청입니다."}
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "잘못된 요청입니다."));
        }
    }

    // ─────────────────────────────────────────
    // 4. 뉴스 수정(관리자, 부분 수정 포함)
    // PUT /api/admins/news/{newsSeq}/
    // PATCH /api/admins/news/{newsSeq}/
    //
    // 기존: X-USER-SEQ 헤더 사용
    // 변경: JWT의 user_seq 클레임 사용
    // ─────────────────────────────────────────
    @PutMapping("/admins/news/{newsSeq}/")
    public ResponseEntity<?> updateNews(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("newsSeq") Integer newsSeq,
            @RequestBody NewsUpdateRequestDto requestDto
    ) {
        return doUpdate(jwt, newsSeq, requestDto);
    }

    @PatchMapping("/admins/news/{newsSeq}/")
    public ResponseEntity<?> patchNews(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("newsSeq") Integer newsSeq,
            @RequestBody NewsUpdateRequestDto requestDto
    ) {
        return doUpdate(jwt, newsSeq, requestDto);
    }

    // PUT/PATCH 공통 내부 헬퍼: 입출력 변환 + 서비스 위임만 수행
    private ResponseEntity<?> doUpdate(
            Jwt jwt,
            Integer newsSeq,
            NewsUpdateRequestDto requestDto
    ) {
        try {
            Integer actorUserSeq = currentUserSeq(jwt);

            // 1) DTO -> 유즈케이스 입력 모델
            NewsUseCase.NewsUpdateCommand command =
                    requestDto.toCommand(actorUserSeq, newsSeq);

            // 2) 비즈니스 로직 실행
            NewsUseCase.NewsUpdateResult result = newsUseCase.updateNews(command);

            // 3) 응답 DTO 변환
            NewsUpdateResponseDto responseDto = NewsUpdateResponseDto.from(result);

            return ResponseEntity.ok(responseDto);

        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "잘못된 요청입니다."));
        } catch (NotFoundException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", ex.getMessage()));
        }
    }

    // ─────────────────────────────────────────
    // 5. 뉴스 삭제(관리자)
    // DELETE /api/admins/news/{newsSeq}/
    //
    // 기존: X-USER-SEQ 헤더 사용
    // 변경: JWT의 user_seq 클레임 사용
    // ─────────────────────────────────────────
    @DeleteMapping("/admins/news/{newsSeq}/")
    public ResponseEntity<?> deleteNews(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("newsSeq") Integer newsSeq
    ) {
        try {
            Integer actorUserSeq = currentUserSeq(jwt);

            // 1) 유즈케이스 입력 모델 생성
            NewsUseCase.NewsDeleteCommand command =
                    new NewsUseCase.NewsDeleteCommand(actorUserSeq, newsSeq);

            // 2) 비즈니스 로직 실행 (삭제 이력 + 실제 삭제)
            newsUseCase.deleteNews(command);

            // 3) 응답 DTO 생성
            NewsDeleteResponseDto responseDto =
                    new NewsDeleteResponseDto("뉴스가 삭제되었습니다.");

            return ResponseEntity.ok(responseDto);

        } catch (NotFoundException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", ex.getMessage()));
        }
    }

    // ─────────────────────────────────────────
    // 6. 프리사인드 업로드 URL 발급(관리자)
    // POST /api/admins/news/uploads/urls/
    //
    // 기존: X-USER-SEQ 헤더 사용
    // 변경: JWT의 user_seq 클레임 사용
    // ─────────────────────────────────────────
    @PostMapping("/admins/news/uploads/urls/")
    public ResponseEntity<?> createPresignedUploadUrl(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody PresignedUploadRequestDto requestDto
    ) {
        try {
            Integer actorUserSeq = currentUserSeq(jwt);

            // 1) DTO -> 유즈케이스 입력 모델
            NewsUseCase.CreatePresignedUploadUrlCommand command =
                    requestDto.toCommand(actorUserSeq);

            // 2) 비즈니스 로직 실행
            NewsUseCase.PresignedUploadUrlResult result =
                    newsUseCase.createPresignedUploadUrl(command);

            // 3) 응답 DTO 변환
            PresignedUploadResponseDto responseDto =
                    PresignedUploadResponseDto.from(result);

            return ResponseEntity.ok(responseDto);

        } catch (IllegalArgumentException ex) {
            // kind, filename 등 잘못된 경우
            return ResponseEntity.badRequest()
                    .body(Map.of("message", ex.getMessage()));
        } catch (IllegalStateException ex) {
            // S3 presign 실패 등 내부 오류 -> 500
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "업로드 URL 생성에 실패했습니다."));
        }
    }

    // ─────────────────────────────────────────
    // 내부 헬퍼 메서드들
    // ─────────────────────────────────────────

    // JWT Principal에서 현재 로그인 사용자 PK(user_seq) 꺼내는 메서드
    //  - jwt 가 null 이거나, claim 이 없거나, 타입이 이상하면
    //    AuthenticationCredentialsNotFoundException 던짐 -> GlobalExceptionHandler에서 401로 매핑
    private Integer currentUserSeq(Jwt jwt) {
        if (jwt == null) {
            throw new AuthenticationCredentialsNotFoundException("로그인이 필요합니다.");
        }

        Object claim = jwt.getClaim(USER_ID_CLAIM);
        if (claim == null) {
            throw new AuthenticationCredentialsNotFoundException("토큰에 사용자 정보가 없습니다.");
        }

        if (claim instanceof Integer i) {
            return i;
        }
        if (claim instanceof Number n) {
            return n.intValue();
        }
        if (claim instanceof String s) {
            try {
                return Integer.parseInt(s);
            } catch (NumberFormatException e) {
                throw new AuthenticationCredentialsNotFoundException("유효하지 않은 사용자 식별자입니다.");
            }
        }

        throw new AuthenticationCredentialsNotFoundException("유효하지 않은 사용자 식별자 타입입니다.");
    }
}
