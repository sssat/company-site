// common/mail/MailService.java
// 스프링 메일 발송 유틸 서비스
// - 순수 텍스트 메일 전송
// - HTML 메일 전송
// - 비밀번호 재설정(Reset Password) 전용 메일 전송 + 링크 생성
//
// 설정 사용처(application.yml):
// spring.mail.*              -> SMTP 서버/계정(NAVER_USER, NAVER_APP_PASS 등)
// app.mail.from              -> 기본 발신자(없으면 spring.mail.username으로 대체)
// app.frontend.base-url      -> 프론트 기본 URL (예: https://xxx.trycloudflare.com)
// app.frontend.password-reset-path -> 비밀번호 재설정 라우트 경로 (예: /change-password)

package com.marketstage.backend.common.mail;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Slf4j
@Service
@RequiredArgsConstructor
public class MailService {

    // 스프링이 starter-mail 로 자동 구성해 주입해주는 SMTP 클라이언트
    private final JavaMailSender mailSender;

    // 기본 발신자 — application.yml 의 app.mail.from (없으면 spring.mail.username 사용)
    @Value("${app.mail.from:}")
    private String appFrom;

    @Value("${spring.mail.username:}")
    private String springMailUser;

    // 비밀번호 재설정 링크 구성용 (장고 settings 에서 옮겨온 값들과 동일 키)
    @Value("${app.frontend.base-url:http://127.0.0.1:5173}")
    private String frontendBaseUrl;

    @Value("${app.frontend.password-reset-path:/change-password}")
    private String passwordResetPath;

    // ─────────────────────────────────────────────────────────
    // 1) 순수 텍스트 메일 전송
    // ─────────────────────────────────────────────────────────
    public void sendText(@NonNull String to, @NonNull String subject, @NonNull String body) {
        String from = resolveFrom();
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(from);
            msg.setTo(to);
            msg.setSubject(subject);
            msg.setText(body);
            mailSender.send(msg);
            log.info("메일(텍스트) 전송 성공: to={}, subject={}", to, subject);
        } catch (Exception e) {
            // 운영에서는 알람/재시도 전략 고려
            log.error("메일(텍스트) 전송 실패: to={}, subject={}", to, subject, e);
            throw new IllegalStateException("메일 전송 오류(텍스트)", e);
        }
    }

    // ─────────────────────────────────────────────────────────
    // 2) HTML 메일 전송
    // ─────────────────────────────────────────────────────────
    public void sendHtml(@NonNull String to, @NonNull String subject, @NonNull String html) {
        String from = resolveFrom();
        try {
            MimeMessage mime = mailSender.createMimeMessage();
            MimeMessageHelper helper =
                new MimeMessageHelper(mime, MimeMessageHelper.MULTIPART_MODE_NO, StandardCharsets.UTF_8.name());
            helper.setFrom(from);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true); // true -> HTML
            mailSender.send(mime);
            log.info("메일(HTML) 전송 성공: to={}, subject={}", to, subject);
        } catch (Exception e) {
            log.error("메일(HTML) 전송 실패: to={}, subject={}", to, subject, e);
            throw new IllegalStateException("메일 전송 오류(HTML)", e);
        }
    }

    // ─────────────────────────────────────────────────────────
    // 3) 비밀번호 재설정 메일 전송(템플릿 포함)
    //    - token 은 컨트롤러/서비스에서 발급한 서명 토큰/JWT/난수 모두 가능
    // ─────────────────────────────────────────────────────────
    public void sendPasswordResetEmail(
            @NonNull String toEmail,
            @Nullable String userName,
            @NonNull String token
    ) {
        final String link = buildPasswordResetLink(token);
        final String displayName = (userName == null || userName.isBlank()) ? "" : userName + "님, ";

        final String subject = "[Market Stage] 비밀번호 재설정 안내";
        // 아주 심플한 인라인 템플릿(필요 시 Thymeleaf/Freemarker 로 확장 가능)
        final String html = """
            <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:24px auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
              <h2 style="margin:0 0 12px;color:#111827;">비밀번호 재설정</h2>
              <p style="margin:0 0 12px;color:#374151;">%s다음 버튼을 눌러 새 비밀번호를 설정해 주세요.</p>
              <p style="margin:0 0 16px;"><a href="%s" target="_blank"
                    style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;">비밀번호 재설정</a></p>
              <p style="margin:0;color:#6b7280;">링크가 동작하지 않으면 아래 주소를 복사해 브라우저 주소창에 붙여넣기 하세요.</p>
              <p style="margin:8px 0 0;color:#111827;word-break:break-all;">%s</p>
            </div>
            """.formatted(displayName, link, link);

        sendHtml(toEmail, subject, html);
    }

    // ─────────────────────────────────────────────────────────
    // 4) 비밀번호 재설정 링크 생성
    //    - baseUrl 과 path 사이, path 와 쿼리 사이 슬래시 정리
    //    - token 은 URL 인코딩(UTF-8)
    //    - 결과 예) https://xxx.trycloudflare.com/change-password?token=abcd...
    // ─────────────────────────────────────────────────────────
    public String buildPasswordResetLink(@NonNull String token) {
        String base = trimRightSlash(frontendBaseUrl);
        String path = ensureLeadingSlash(passwordResetPath);
        String encoded = URLEncoder.encode(token, StandardCharsets.UTF_8);
        return base + path + "?token=" + encoded;
    }

    // ─────────────────────────────────────────────────────────
    // 헬퍼
    // ─────────────────────────────────────────────────────────
    private String resolveFrom() {
        // app.mail.from 이 비어있으면 spring.mail.username 사용
        if (appFrom != null && !appFrom.isBlank()) return appFrom;
        if (springMailUser != null && !springMailUser.isBlank()) return springMailUser;
        throw new IllegalStateException("발신자 주소가 설정되지 않았습니다. (app.mail.from 또는 spring.mail.username)");
        // 필요 시: return "no-reply@example.com";
    }

    private static String trimRightSlash(String s) {
        if (s == null) return "";
        return s.endsWith("/") ? s.substring(0, s.length() - 1) : s;
    }

    private static String ensureLeadingSlash(String s) {
        if (s == null || s.isBlank()) return "/";
        return s.startsWith("/") ? s : "/" + s;
    }
}
