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
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class InquiriesController {

    // AccountsController와 동일하게, 현재 로그인 유저 PK를 담는 헤더 이름
    private static final String ACTOR_USER_SEQ_HEADER = "X-USER-SEQ";

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
    // GET /api/inquiries?page=&size=&q=&status=&order=/
    // ─────────────────────────────────────────
    @GetMapping("/inquiries")
    public ResponseEntity<InquiryListResponseDto> listInquiries(
            @RequestHeader(ACTOR_USER_SEQ_HEADER) Integer actorUserSeq,
            @RequestParam(name = "page",   defaultValue = "1")  int page,
            @RequestParam(name = "size",   defaultValue = "10") int size,
            @RequestParam(name = "q",      required = false)    String q,
            @RequestParam(name = "status", defaultValue = "all") String status,
            @RequestParam(name = "order",  defaultValue = "recent") String order
    ) {
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
    // GET /api/inquiries/{inquiry_seq}/
    // ─────────────────────────────────────────
    @GetMapping("/inquiries/{inquiry_seq}")
    public ResponseEntity<InquiryDetailResponseDto> getInquiryDetail(
            @RequestHeader(ACTOR_USER_SEQ_HEADER) Integer actorUserSeq,
            @PathVariable("inquiry_seq") Integer inquirySeq
    ) {
        // 서비스에 상세 조회 위임
        InquiriesUseCase.InquiryDetailResult result =
                inquiriesUseCase.getInquiryDetail(actorUserSeq, inquirySeq);

        // 유즈케이스 결과 -> 응답 DTO로 변환
        InquiryDetailResponseDto dto = InquiryDetailResponseDto.from(result);

        return ResponseEntity.ok(dto);
    }

    // ─────────────────────────────────────────
    // 4) 처리 상태 변경 (처리완료 전환 전용, 관리자)
    // PUT /api/inquiries/{inquiry_seq}/process/
    // ─────────────────────────────────────────
    @PutMapping("/inquiries/{inquiry_seq}/process")
    public ResponseEntity<InquiryProcessResponseDto> processInquiry(
            @RequestHeader(ACTOR_USER_SEQ_HEADER) Integer actorUserSeq,
            @PathVariable("inquiry_seq") Integer inquirySeq,
            @RequestBody InquiryProcessRequestDto request
    ) {
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
    // DELETE /api/inquiries/{inquiry_seq}/
    // ─────────────────────────────────────────
    @DeleteMapping("/inquiries/{inquiry_seq}")
    public ResponseEntity<InquiryDeleteResponseDto> deleteInquiry(
            @RequestHeader(ACTOR_USER_SEQ_HEADER) Integer actorUserSeq,
            @PathVariable("inquiry_seq") Integer inquirySeq
    ) {
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
}
