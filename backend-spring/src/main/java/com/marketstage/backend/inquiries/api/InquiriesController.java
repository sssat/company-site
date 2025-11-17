// src/main/java/com/marketstage/backend/inquiries/api/InquiriesController.java

package com.marketstage.backend.inquiries.api;

import com.marketstage.backend.inquiries.api.dto.InquiryCreateDto.InquiryCreateRequestDto;
import com.marketstage.backend.inquiries.api.dto.InquiryCreateDto.InquiryCreateResponseDto;
import com.marketstage.backend.inquiries.api.dto.InquiryDeleteDto.InquiryDeleteResponseDto;
import com.marketstage.backend.inquiries.api.dto.InquiryDetailDto.InquiryDetailResponseDto;
import com.marketstage.backend.inquiries.api.dto.InquiryListDto.InquiryListRequestDto;
import com.marketstage.backend.inquiries.api.dto.InquiryListDto.InquiryListResponseDto;
import com.marketstage.backend.inquiries.api.dto.InquiryProcessDto.InquiryProcessRequestDto;
import com.marketstage.backend.inquiries.api.dto.InquiryProcessDto.InquiryProcessResponseDto;
import com.marketstage.backend.inquiries.application.port.in.InquiriesUseCase;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class InquiriesController {

    // JWT 안의 사용자 PK 클레임 이름 (application.yml 의 app.jwt.user-id-claim 기본값과 맞춤)
    private static final String USER_ID_CLAIM = "user_seq";

    // 비즈니스 로직 호출용 인스턴스 변수
    private final InquiriesUseCase inquiriesUseCase;

    // ─────────────────────────────────────────
    // 1) 문의 등록 (공개)
    // POST /api/inquiries/
    // ─────────────────────────────────────────
    @PostMapping("/inquiries/")
    public ResponseEntity<InquiryCreateResponseDto> createInquiry(
            @RequestBody InquiryCreateRequestDto request
    ) {
        // 요청 DTO -> 유즈케이스 입력 모델(CreateInquiryCommand)로 변환
        InquiriesUseCase.CreateInquiryCommand command = request.toCommand();

        // 서비스에 문의 등록을 위임
        InquiriesUseCase.CreateInquiryResult result =
                inquiriesUseCase.createInquiry(command);

        // 유즈케이스 결과를 API 응답 DTO로 변환
        InquiryCreateResponseDto dto = InquiryCreateResponseDto.from(result);

        // 201 Created로 응답
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    // ─────────────────────────────────────────
    // 2) 문의 목록 조회 (관리자 전용)
    // GET /api/admins/inquiries/?page=&size=&q=&status=&order=
    //
    // 기존: X-USER-SEQ 헤더 사용
    // 변경: JWT 의 user_seq 클레임 사용
    // ─────────────────────────────────────────
    @GetMapping("/admins/inquiries/")
    public ResponseEntity<InquiryListResponseDto> listInquiries(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(name = "page",   defaultValue = "1")  int page,
            @RequestParam(name = "size",   defaultValue = "10") int size,
            @RequestParam(name = "q",      required = false)    String q,
            @RequestParam(name = "status", defaultValue = "all") String status,
            @RequestParam(name = "order",  defaultValue = "recent") String order
    ) {
        Integer actorUserSeq = currentUserSeq(jwt);

        // 쿼리스트링을 하나의 요청 DTO로 묶은 뒤,
        // DTO의 toQuery(actorUserSeq)를 사용해 유즈케이스 쿼리로 변환
        InquiryListRequestDto reqDto = new InquiryListRequestDto(page, size, q, status, order);

        InquiriesUseCase.InquiryListQuery query = reqDto.toQuery(actorUserSeq);

        // 서비스에 목록 조회를 위임
        InquiriesUseCase.InquiryListResult result =
                inquiriesUseCase.listInquiries(query);

        // 유즈케이스 결과 -> 응답 DTO로 변환
        InquiryListResponseDto dto = InquiryListResponseDto.from(result);

        return ResponseEntity.ok(dto);
    }

    // ─────────────────────────────────────────
    // 3) 문의 단건 상세 조회 (관리자 전용)
    // GET /api/admins/inquiries/{inquiry_seq}/
    //
    // 기존: X-USER-SEQ 헤더 사용
    // 변경: JWT 의 user_seq 클레임 사용
    // ─────────────────────────────────────────
    @GetMapping("/admins/inquiries/{inquiry_seq}/")
    public ResponseEntity<InquiryDetailResponseDto> getInquiryDetail(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("inquiry_seq") Integer inquirySeq
    ) {
        Integer actorUserSeq = currentUserSeq(jwt);

        // 서비스에 상세 조회 위임
        InquiriesUseCase.InquiryDetailResult result =
                inquiriesUseCase.getInquiryDetail(actorUserSeq, inquirySeq);

        // 유즈케이스 결과 -> 응답 DTO로 변환
        InquiryDetailResponseDto dto = InquiryDetailResponseDto.from(result);

        return ResponseEntity.ok(dto);
    }

    // ─────────────────────────────────────────
    // 4) 처리 상태 변경 (처리완료 전환 전용, 관리자)
    // PUT /api/admins/inquiries/{inquiry_seq}/process/
    //
    // 기존: X-USER-SEQ 헤더 사용
    // 변경: JWT 의 user_seq 클레임 사용
    // ─────────────────────────────────────────
    @PutMapping("/admins/inquiries/{inquiry_seq}/process/")
    public ResponseEntity<InquiryProcessResponseDto> processInquiry(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("inquiry_seq") Integer inquirySeq,
            @RequestBody InquiryProcessRequestDto request
    ) {
        Integer actorUserSeq = currentUserSeq(jwt);

        // 헤더/경로 + 바디를 합쳐 유즈케이스 커맨드로 변환
        InquiriesUseCase.ProcessInquiryCommand command =
                request.toCommand(actorUserSeq, inquirySeq);

        // 서비스에 처리 상태 변경을 위임
        InquiriesUseCase.ProcessInquiryResult result =
                inquiriesUseCase.processInquiry(command);

        // 유즈케이스 결과를 InquiryProcessResponseDto로 변환
        InquiryProcessResponseDto dto = InquiryProcessResponseDto.from(result);

        return ResponseEntity.ok(dto);
    }

    // ─────────────────────────────────────────
    // 5) 삭제 (항상 영구 삭제, 관리자)
    // DELETE /api/admins/inquiries/{inquiry_seq}/
    //
    // 기존: X-USER-SEQ 헤더 사용
    // 변경: JWT 의 user_seq 클레임 사용
    // ─────────────────────────────────────────
    @DeleteMapping("/admins/inquiries/{inquiry_seq}/")
    public ResponseEntity<InquiryDeleteResponseDto> deleteInquiry(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("inquiry_seq") Integer inquirySeq
    ) {
        Integer actorUserSeq = currentUserSeq(jwt);

        // 헤더/경로를 유즈케이스 커맨드로 묶기
        InquiriesUseCase.DeleteInquiryCommand command =
                new InquiriesUseCase.DeleteInquiryCommand(actorUserSeq, inquirySeq);

        // 서비스에 삭제 위임
        InquiriesUseCase.DeleteInquiryResult result =
                inquiriesUseCase.deleteInquiry(command);

        // 유즈케이스 결과 -> 응답 DTO로 변환
        InquiryDeleteResponseDto dto = InquiryDeleteResponseDto.from(result);

        return ResponseEntity.ok(dto);
    }

    // ─────────────────────────────────────────
    // 내부 헬퍼: JWT 에서 현재 로그인 사용자 PK 꺼내기
    // ─────────────────────────────────────────
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
