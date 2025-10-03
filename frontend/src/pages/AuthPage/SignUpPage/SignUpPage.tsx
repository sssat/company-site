import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import SignUpCard from "../../../components/Auth/SignUp/SignUpCard/SignUpCard";
import type { SignUpForm } from "../../../components/Auth/SignUp/SignUpCard/SignUpCard";

import axios, { AxiosError } from "axios";
import {
  precheckUserId,
  precheckEmail,
  register,
  type RegisterPayload,
} from "../../../api/accountsApi";

import {
  validateUserId,
  validateName,
  validateEmail,
  validatePassword,
  validateBirth,
  validateGender,
  type UiGender,
} from "../../../utils/signupValidators";

/** UI 성별 -> 서버 성별 ("M" | "F" | null) */
function toServerGender(g: UiGender): "M" | "F" | null {
  if (g === "male") return "M";
  if (g === "female") return "F";
  return null;
}

/** 서버 성별 타입가드 */
function isServerGender(x: unknown): x is "M" | "F" {
  return x === "M" || x === "F";
}

/** 연/월/일 -> "YYYY-MM-DD" (빈 값 있으면 "") */
function toBirthDate(y: string, m: string, d: string): string {
  if (!y || !m || !d) return "";
  const mm = m.padStart(2, "0");
  const dd = d.padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

/** 폼 에러 상태(필드별) */
type FieldErrors = {
  username?: string;
  name?: string;
  email?: string;
  password?: string;
  password2?: string;
  birth?: string;
  gender?: string;
  agree?: string;
  /** 상단 공통 에러(서버 실패 등) */
  general?: string;
};

/** 백엔드에서 올 수 있는 에러 페이로드 타입 */
interface ApiErrorData {
  message?: string;
  username?: unknown;
  user_name?: unknown;
  user_id?: unknown;
  email?: unknown;
  password?: unknown;
  password2?: unknown;
  gender?: unknown;
  birth_date?: unknown;
  birth?: unknown;
  agree_whether?: unknown;
}

/** 배열/문자 혼합 응답에서 첫 문구 뽑기 */
function firstString(v: unknown): string | undefined {
  if (Array.isArray(v)) {
    const v0 = v[0];
    return typeof v0 === "string" ? v0 : undefined;
  }
  return typeof v === "string" ? v : undefined;
}

export default function SignUpPage() {
  const nav = useNavigate();

  // 사전검사 토큰
  const [idCheckToken, setIdCheckToken] = useState<string | null>(null);
  const [emailCheckToken, setEmailCheckToken] = useState<string | null>(null);
  // 토큰이 커버하는 마지막 값(사용자가 바꾸면 재검사 요구)
  const [checkedUserId, setCheckedUserId] = useState<string | null>(null);
  const [checkedEmail, setCheckedEmail] = useState<string | null>(null);

  // 필드 에러 상태
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    document.title = "회원가입 | Market Stage";
    window.scrollTo(0, 0);
  }, []);

  /** ID 중복확인 버튼 핸들러 */
  const handleCheckId = async (username: string) => {
    const msg = validateUserId(username);
    if (msg) throw new Error(msg);

    const userId = username.trim();
    const r = await precheckUserId(userId);

    const ok =
      r.user_id?.valid === true &&
      r.user_id?.status === "available" &&
      typeof r.id_check_token === "string";

    if (ok) {
      setIdCheckToken(r.id_check_token!);
      setCheckedUserId(userId);
      return true;
    }

    // 실패 사유 매핑
    const status = r.user_id?.status as string | undefined;
    const reason =
      r.message ||
      (status === "taken" || status === "duplicate"
        ? "이미 사용 중인 아이디입니다."
        : status === "invalid" ||
          status === "invalid_format" ||
          status === "format_error"
        ? "아이디 형식이 올바르지 않습니다. (영문 소문자/숫자 5~20자)"
        : status === "reserved"
        ? "사용이 제한된 아이디입니다."
        : "아이디를 사용할 수 없습니다.");

    throw new Error(reason);
  };

  /** Email 중복확인 버튼 핸들러 */
  const handleCheckEmail = async (emailInput: string) => {
    const msg = validateEmail(emailInput);
    if (msg) throw new Error(msg);

    const email = emailInput.trim();
    const r = await precheckEmail(email);

    const ok =
      r.email?.valid === true &&
      r.email?.status === "available" &&
      typeof r.email_check_token === "string";

    if (ok) {
      setEmailCheckToken(r.email_check_token!);
      setCheckedEmail(email);
      return true;
    }

    // 실패 사유 매핑
    const status = r.email?.status as string | undefined;
    const reason =
      r.message ||
      (status === "taken" || status === "duplicate"
        ? "이미 사용 중인 이메일입니다."
        : status === "domain_not_allowed" || status === "forbidden_domain"
        ? "허용되지 않은 이메일 도메인입니다. (gmail/naver/kakao)"
        : status === "invalid" || status === "invalid_format"
        ? "이메일 형식이 올바르지 않습니다."
        : "이메일을 사용할 수 없습니다.");

    throw new Error(reason);
  };

  /** 최종 제출 */
  const handleSubmit = async (form: SignUpForm) => {
    // 제출 전 에러 초기화
    setErrors({});

    const user_id = form.username.trim();
    const user_name = form.name.trim();
    const email = form.email.trim();
    const password = form.password;
    const password2 = form.password2;

    // 1) 프론트 1차 검사
    const nextErrors: FieldErrors = {};
    const e1 = validateUserId(user_id);                 if (e1) nextErrors.username = e1;
    const eName = validateName(user_name);              if (eName) nextErrors.name = eName;  
    if (!user_name) nextErrors.name = "이름을 입력해주세요.";
    const e2 = validateEmail(email);                    if (e2) nextErrors.email = e2;
    const e3 = validatePassword(password, password2, user_id);
                                                        if (e3) nextErrors.password = e3;
    const e4 = validateBirth(form.birthYear, form.birthMonth, form.birthDay);
                                                        if (e4) nextErrors.birth = e4;
    const e5 = validateGender(form.gender as UiGender); if (e5) nextErrors.gender = e5;
    if (!form.agree) nextErrors.agree = "이용약관 동의가 필요합니다.";

    // 2) 성별 변환
    const rawGender = toServerGender(form.gender as UiGender);
    if (!isServerGender(rawGender)) {
      nextErrors.gender = nextErrors.gender || "성별을 선택하세요.";
    }
    const gender: "M" | "F" | null = isServerGender(rawGender) ? rawGender : null;

    const birth_date = toBirthDate(form.birthYear, form.birthMonth, form.birthDay);
    const agree_whether = form.agree;

    // 3) 중복확인 토큰 체크(필드 에러로)
    if (!idCheckToken) {
      nextErrors.username = nextErrors.username || "아이디 중복확인을 해주세요.";
    } else if (checkedUserId !== user_id) {
      nextErrors.username = nextErrors.username || "아이디가 변경되었습니다. 아이디 중복확인을 다시 해주세요.";
    }

    if (!emailCheckToken) {
      nextErrors.email = nextErrors.email || "이메일 중복확인을 해주세요.";
    } else if (checkedEmail !== email) {
      nextErrors.email = nextErrors.email || "이메일이 변경되었습니다. 이메일 중복확인을 다시 해주세요.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    try {
      // 4) payload
      const payload: RegisterPayload = {
        user_id,
        password,
        password2,
        username: user_name,     // 서버 필드명: username
        birth_date,
        gender: gender as "M" | "F",
        email,
        agree_whether,
        id_check_token: idCheckToken!,
        email_check_token: emailCheckToken!,
      };

      await register(payload);

      // 성공
      setErrors({});
      nav(`/signup/success?name=${encodeURIComponent(user_name)}`, {
        state: { name: user_name },
        replace: true,
      });
    } catch (err: unknown) {
      // 서버 응답을 필드 에러로 매핑
      if (axios.isAxiosError(err) && err.response) {
        const ax = err as AxiosError<ApiErrorData>;
        const data = ax.response?.data;

        if (data) {
          const fe: FieldErrors = {};

          // 이름(서버: username 또는 user_name) → name 필드에 고정 문구로
          if (data.username !== undefined || data.user_name !== undefined) {
            fe.name = "사용 불가능한 이름입니다.";
          }

          // 기타 가능성 있는 필드 매핑
          if (data.user_id !== undefined) fe.username = firstString(data.user_id) ?? "아이디를 사용할 수 없습니다.";
          if (data.email !== undefined) fe.email = firstString(data.email) ?? "이메일을 사용할 수 없습니다.";
          if (data.password !== undefined) fe.password = firstString(data.password);
          if (data.password2 !== undefined) fe.password2 = firstString(data.password2);
          if (data.gender !== undefined) fe.gender = firstString(data.gender);
          if (data.birth_date !== undefined || data.birth !== undefined) {
            fe.birth = firstString(data.birth_date ?? data.birth);
          }
          if (data.agree_whether !== undefined) fe.agree = firstString(data.agree_whether);

          if (Object.keys(fe).length > 0) {
            setErrors(fe); // 필드 아래에 표시
            return;
          }
        }

        // 필드단이 아니면 상단 공통 에러로
        const msg = data?.message ?? ax.message ?? "회원가입에 실패했습니다.";
        setErrors({ general: msg });
        return;
      }

      setErrors({ general: "회원가입에 실패했습니다." });
    }
  };

  return (
    <main style={{ padding: "32px 16px" }}>
      <SignUpCard
        onSubmit={handleSubmit}
        onCheckId={handleCheckId}
        onCheckEmail={handleCheckEmail}
        cardWidth={420}
        /** 에러 내려주기 */
        errors={errors}
        /** 인풋 변경 시 해당 에러 지우기 */
        onClearError={(field) => setErrors((prev) => ({ ...prev, [field]: undefined }))}
      />
    </main>
  );
}
