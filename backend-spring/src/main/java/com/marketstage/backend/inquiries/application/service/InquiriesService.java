// inquiries/application/service/InquiriesService.java

package com.marketstage.backend.inquiries.application.service;

import com.marketstage.backend.common.exception.NotFoundException;
import com.marketstage.backend.inquiries.application.port.in.InquiriesUseCase;
import com.marketstage.backend.inquiries.application.port.out.InquiryRepository;
import com.marketstage.backend.inquiries.domain.model.Inquiry;

import com.marketstage.backend.accounts.application.port.out.UserRepository;
import com.marketstage.backend.accounts.domain.model.User;

import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.regex.Pattern;

@Service
@Transactional
@RequiredArgsConstructor
public class InquiriesService implements InquiriesUseCase {

    // ─────────────────────────────────────────────────────────
    // 상수/정규식
    // ─────────────────────────────────────────────────────────
    private static final Pattern NAME_PATTERN =
            Pattern.compile("^(?=.{2,50}$)[가-힣a-zA-Z]+(?: [가-힣a-zA-Z]+)*$");

    private static final int NAME_MIN_LEN = 50;
    private static final int NAME_MAX_LEN = 50;
    private static final int TITLE_MAX_LEN = 50;
    private static final int MESSAGE_MIN_LEN = 50;

    // ─────────────────────────────────────────────────────────
    // 인스턴스 변수(의존성)
    // ─────────────────────────────────────────────────────────

    // 문의 퍼시스턴스 아웃바운드 포트
    private final InquiryRepository inquiryRepository;

    // 관리자 권한 확인 및 processed_by 설정을 위한 UserRepository
    private final UserRepository userRepository;

    // 현재 시각 주입용 (테스트 편의를 위해 Clock 사용)
    private final Clock clock;

    // ─────────────────────────────────────────────────────────
    // 1) createInquiry: 문의 등록 
    // ─────────────────────────────────────────────────────────
    @Override
    public CreateInquiryResult createInquiry(CreateInquiryCommand command) {
        Objects.requireNonNull(command, "command");
        ensureNotBlank(command.name(), "name");
        ensureNotBlank(command.email(), "email");
        ensureNotBlank(command.title(), "title");
        ensureNotBlank(command.message(), "message");

        String name    = command.name().trim();
        String email   = command.email().trim();
        String title   = command.title().trim();
        String message = command.message().trim();

        // 이름 정규식 검증 
        if (!NAME_PATTERN.matcher(name).matches()) {
            throw new IllegalArgumentException("이름은 2~50자 한글/영문과 공백만 사용할 수 있습니다.");
        }

        // 간단 이메일 포맷 검증
        int at = email.indexOf('@');
        if (at <= 0 || at == email.length() - 1) {
            throw new IllegalArgumentException("올바른 이메일 형식이 아닙니다.");
        }

        // 제목 길이 검증 (예: 최대 50자)
        if (title.length() > TITLE_MAX_LEN) {
            throw new IllegalArgumentException("제목은 최대 " + TITLE_MAX_LEN + "자까지 입력 가능합니다.");
        }

        // 문의 내용 길이 검증
        if (message.strip().length() < MESSAGE_MIN_LEN) {
            throw new IllegalArgumentException("문의 내용은 50자 이상 입력해주세요.");
        }

        // Inquiry 엔티티 생성 (title -> title 매핑)
        Inquiry inquiry = Inquiry.builder()
                .name(name)
                .email(email)
                .title(title)
                .message(message)
                .build();

        Inquiry saved = inquiryRepository.save(inquiry);

        // InquiriesUseCase.CreateInquiryResult(inquirySeq, message) 시그니처에 맞게 반환
        return new CreateInquiryResult(
                saved.getInquirySeq(),
                "문의가 등록되었습니다."
        );
    }


    // ─────────────────────────────────────────────────────────
    // 2) listInquiries: 문의 목록 조회 
    // ─────────────────────────────────────────────────────────
    @Override
    @Transactional(readOnly = true)
    public InquiryListResult listInquiries(InquiryListQuery query) {
        Objects.requireNonNull(query, "query");

        // (A) 권한 체크: ADMIN(1)+
        requireAdmin(query.actorUserSeq());

        // (B) 페이지 파라미터 정규화
        int page = Math.max(1, query.page());
        int size = Math.max(1, Math.min(100, query.size()));
        int offset = (page - 1) * size;

        // (C) 검색/상태/정렬 파라미터
        String q       = safe(query.q());
        String status  = safe(query.status()); // "all" | "pending" | "done"
        String order   = safe(query.order());  // "recent" | "oldest"

        Boolean processedFilter = switch (status) {
            case "pending" -> Boolean.FALSE;
            case "done"    -> Boolean.TRUE;
            default        -> null;
        };

        // 정렬 방향: "oldest" 이면 오름차순, 나머지는 전부 최신순(recent)
        boolean orderAsc = "oldest".equalsIgnoreCase(order);

        // (D) 총 개수 및 행 조회
        long total = inquiryRepository.countByFilter(q, processedFilter);
        List<Inquiry> rows = inquiryRepository.findByFilter(
                q,
                processedFilter,
                orderAsc,
                offset,
                size
        );
        int totalPages = (total == 0) ? 0 : (int) Math.ceil((double) total / size);

        // (E) DTO 매핑 (InquiryListItem)
        List<InquiryListItem> items = new ArrayList<>(rows.size());
        for (Inquiry inq : rows) {
            boolean processed = inq.isProcessed();
            Integer processedByUserSeq =
                    (inq.getProcessedBy() != null ? inq.getProcessedBy().getUserSeq() : null);

            String title     = safe(inq.getTitle());
            String excerpt     = buildExcerpt(inq.getMessage());
            String statusLabel = buildStatusLabel(processed);

            items.add(new InquiryListItem(
                    inq.getInquirySeq(),
                    safe(inq.getName()),
                    safe(inq.getEmail()),
                    title,
                    excerpt,
                    inq.getSubmittedAt(),
                    processed,
                    inq.getProcessedAt(),
                    processedByUserSeq,
                    statusLabel
            ));
        }

        return new InquiryListResult(items, page, size, total, totalPages);
    }

    // ─────────────────────────────────────────────────────────
    // 3) getInquiryDetail: 문의 단건 상세 조회
    // ─────────────────────────────────────────────────────────
    @Override
    @Transactional(readOnly = true)
    public InquiryDetailResult getInquiryDetail(Integer actorUserSeq, Integer inquirySeq) {
        requireAdmin(actorUserSeq);
        Objects.requireNonNull(inquirySeq, "inquirySeq");

        Inquiry inq = inquiryRepository.findById(inquirySeq)
                .orElseThrow(() -> new NotFoundException("대상을 찾을 수 없습니다."));

        boolean processed = inq.isProcessed();
        Integer processedByUserSeq =
                (inq.getProcessedBy() != null ? inq.getProcessedBy().getUserSeq() : null);
        String statusLabel = buildStatusLabel(processed);

        return new InquiryDetailResult(
            inq.getInquirySeq(),
            safe(inq.getName()),
            safe(inq.getEmail()),
            safe(inq.getTitle()),     // title
            safe(inq.getMessage()),
            inq.getSubmittedAt(),
            processed,
            inq.getProcessedAt(),
            processedByUserSeq,
            statusLabel
        );
    }

    // ─────────────────────────────────────────────────────────
    // 4) processInquiry: 문의 처리 상태 변경 (처리완료 전환 전용)
    // ─────────────────────────────────────────────────────────
    @Override
    public ProcessInquiryResult processInquiry(ProcessInquiryCommand command) {
        Objects.requireNonNull(command, "command");
        Objects.requireNonNull(command.actorUserSeq(), "actorUserSeq");
        Objects.requireNonNull(command.inquirySeq(), "inquirySeq");

        // 1) 관리자 권한 + 처리자 엔티티 조회
        User operator = requireAdmin(command.actorUserSeq());

        // 2) 대상 문의 조회 (select_for_update 대응)
        Inquiry inq = inquiryRepository.findByIdForUpdate(command.inquirySeq())
                .orElseThrow(() -> new NotFoundException("대상을 찾을 수 없습니다."));

        // 3) 이미 처리완료라면 멱등 처리: 그대로 반환
        if (inq.isProcessed()) {
            return toProcessResult(inq);
        }

        // 4) 처리완료로 전환
        LocalDateTime now = LocalDateTime.now(clock);
        inq.markProcessed(operator, now);   // isProcessed=true, processedAt, processedBy 설정
        inq = inquiryRepository.save(inq);

        // 5) 결과 변환
        return toProcessResult(inq);
    }

    // ─────────────────────────────────────────────────────────
    // 5) deleteInquiry: 문의 삭제 (항상 영구 삭제)
    // ─────────────────────────────────────────────────────────
    @Override
    public DeleteInquiryResult deleteInquiry(DeleteInquiryCommand command) {
        Objects.requireNonNull(command, "command");
        Objects.requireNonNull(command.actorUserSeq(), "actorUserSeq");
        Objects.requireNonNull(command.inquirySeq(), "inquirySeq");

        // 관리자 권한 체크
        requireAdmin(command.actorUserSeq());

        // 존재 여부 확인 후 삭제
        Inquiry inq = inquiryRepository.findById(command.inquirySeq())
                .orElseThrow(() -> new NotFoundException("대상을 찾을 수 없습니다."));

        inquiryRepository.delete(inq);

        return new DeleteInquiryResult(
                inq.getInquirySeq(),
                true,
                "영구 삭제되었습니다."
        );
    }

    // ─────────────────────────────────────────────────────────
    // 헬퍼 메서드
    // ─────────────────────────────────────────────────────────

    // ADMIN(1) 이상인지 검사하고, User 엔티티를 반환
    private User requireAdmin(Integer actorUserSeq) {
        if (actorUserSeq == null) {
            throw new AuthenticationCredentialsNotFoundException("로그인이 필요합니다.");
        }

        User actor = userRepository.findByIdWithLevel(actorUserSeq)
                .orElseThrow(() -> new AuthenticationCredentialsNotFoundException("로그인이 필요합니다."));

        int gradeCode = 0;
        if (actor.getLevel() != null && actor.getLevel().getGradeCode() != null) {
            gradeCode = actor.getLevel().getGradeCode();
        }

        if (gradeCode < 1) {
            // GlobalExceptionHandler에서 403으로 매핑
            throw new SecurityException("관리자만 접근할 수 있습니다.");
        }
        return actor;
    }

    // 필수 문자열 검증
    private static void ensureNotBlank(String s, String field) {
        if (s == null || s.trim().isEmpty()) {
            throw new IllegalArgumentException("필수값 누락: " + field);
        }
    }

    // Null/공백 안전 문자열
    private static String safe(String s) {
        return (s == null) ? "" : s.trim();
    }

    // 목록용 excerpt 생성 (본문 일부를 잘라서 요약)
    private static String buildExcerpt(String message) {
        String src = safe(message);
        if (src.isEmpty()) return "";
        int max = 120;
        if (src.length() <= max) {
            return src;
        }
        return src.substring(0, max) + "…";
    }

    // 처리 상태 라벨 ("처리중" | "처리완료")
    private static String buildStatusLabel(boolean processed) {
        return processed ? "처리완료" : "처리중";
    }

    // Inquiry -> ProcessInquiryResult 매핑 공통 함수
    private static ProcessInquiryResult toProcessResult(Inquiry inq) {
        boolean processed = inq.isProcessed();
        Integer processedByUserSeq =
                (inq.getProcessedBy() != null ? inq.getProcessedBy().getUserSeq() : null);
        String statusLabel = buildStatusLabel(processed);

        return new ProcessInquiryResult(
                inq.getInquirySeq(),
                safe(inq.getTitle()),   // title
                processed,
                inq.getProcessedAt(),
                processedByUserSeq,
                statusLabel
        );
    }
}
