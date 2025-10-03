import { useMemo, useState } from "react";
import styles from "./SignUpCard.module.css";
import logo from "../../../../assets/company_logo/company_logo.svg";

/** 폼 데이터 타입 */
export type SignUpForm = {
  username: string;
  password: string;
  password2: string;
  name: string;
  birthYear: string;   // YYYY
  birthMonth: string;  // MM
  birthDay: string;    // DD
  gender: "" | "male" | "female" | "other";
  email: string;
  agree: boolean;
};

type LocalErrors =
  Partial<
    Record<
      | "username"
      | "password"
      | "password2"
      | "name"
      | "birth"
      | "gender"
      | "email"
      | "agree"
      | "general",
      string
    >
  >;

type SignUpCardProps = {
  cardWidth?: number | string;
  onSubmit?: (data: SignUpForm) => Promise<void> | void;
  onCheckId: (username: string) => Promise<boolean>;
  onCheckEmail: (email: string) => Promise<boolean>;
  errors?: LocalErrors;
  onClearError?: (field: keyof LocalErrors) => void;
};

export default function SignUpCard({
  cardWidth = 360,
  onSubmit,
  onCheckId,
  onCheckEmail,
  errors: externalErrors,
  onClearError,
}: SignUpCardProps) {
  const [form, setForm] = useState<SignUpForm>({
    username: "",
    password: "",
    password2: "",
    name: "",
    birthYear: "",
    birthMonth: "",
    birthDay: "",
    gender: "",
    email: "",
    agree: false,
  });

  const [localErrors, setLocalErrors] = useState<LocalErrors>({});
  const [checkingId, setCheckingId] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [idChecked, setIdChecked] = useState<boolean | null>(null);
  const [emailChecked, setEmailChecked] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  // 외부 에러와 로컬 에러 병합(외부 에러 우선)
  const uiErrors: LocalErrors = { ...localErrors, ...(externalErrors ?? {}) };

  // CSS 변수(--card-width) 주입
  type StyleVars = React.CSSProperties & { ["--card-width"]?: string };
  const styleVars: StyleVars = useMemo(
    () => ({
      ["--card-width"]:
        typeof cardWidth === "number" ? `${cardWidth}px` : String(cardWidth),
    }),
    [cardWidth]
  );

  const set = <K extends keyof SignUpForm>(key: K, value: SignUpForm[K]) => {
    setForm((s) => ({ ...s, [key]: value }));
  };

  /** 아이디 중복확인 */
  const handleCheckId = async () => {
    setLocalErrors((e) => ({ ...e, username: undefined }));
    onClearError?.("username");

    if (!form.username.trim()) {
      const msg = "아이디를 입력해주세요.";
      setLocalErrors((e) => ({ ...e, username: msg }));
      return;
    }

    setCheckingId(true);
    try {
      const ok = await onCheckId(form.username);
      setIdChecked(ok);
      if (!ok) {
        setLocalErrors((e) => ({ ...e, username: "이미 사용 중인 아이디입니다." }));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "아이디 확인에 실패했습니다.";
      setIdChecked(false);
      setLocalErrors((e) => ({ ...e, username: msg }));
    } finally {
      setCheckingId(false);
    }
  };

  /** 이메일 중복확인 */
  const handleCheckEmail = async () => {
    setLocalErrors((e) => ({ ...e, email: undefined }));
    onClearError?.("email");

    const emailOK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
    if (!emailOK) {
      setLocalErrors((e) => ({ ...e, email: "이메일 형식이 올바르지 않습니다." }));
      return;
    }

    setCheckingEmail(true);
    try {
      const ok = await onCheckEmail(form.email);
      setEmailChecked(ok);
      if (!ok) {
        setLocalErrors((e) => ({ ...e, email: "이미 사용 중인 이메일입니다." }));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "이메일 확인에 실패했습니다.";
      setEmailChecked(false);
      setLocalErrors((e) => ({ ...e, email: msg }));
    } finally {
      setCheckingEmail(false);
    }
  };

  /** 제출: 유효성 검사는 상위에서 처리 */
  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!onSubmit) return;
    setLoading(true);
    try {
      await onSubmit(form);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.section} aria-label="회원가입">
      <div className={styles.wrap} style={styleVars}>
        <div className={styles.card}>
          <img src={logo} alt="MARKET STAGE" className={styles.logo} />

          {/* 상단 공통 에러 */}
          {uiErrors.general && (
            <div className={styles.error} role="alert" style={{ marginBottom: 8 }}>
              {uiErrors.general}
            </div>
          )}

          <form className={styles.form} onSubmit={submit} noValidate>
            {/* 아이디 */}
            <div className={styles.row}>
              <label htmlFor="username" className={styles.label}>아이디</label>
              <div className={styles.inlineOut}>
                <input
                  id="username"
                  className={styles.input}
                  autoComplete="username"
                  placeholder="아이디"
                  value={form.username}
                  onChange={(e) => {
                    set("username", e.target.value);
                    setIdChecked(null);
                    setLocalErrors((er) => ({ ...er, username: undefined }));
                    onClearError?.("username");
                  }}
                />
                <button
                  type="button"
                  className={styles.sideBtn}
                  onClick={handleCheckId}
                  disabled={checkingId || !form.username.trim()}
                  aria-label="아이디 중복확인"
                  title="ID 중복확인"
                >
                  {checkingId ? "확인중…" : "ID 중복확인"}
                </button>
              </div>
            </div>
            {uiErrors.username && <p className={styles.error}>{uiErrors.username}</p>}
            {idChecked === true && <p className={styles.ok}>사용 가능한 아이디입니다.</p>}

            {/* 비밀번호 */}
            <div className={styles.row}>
              <label htmlFor="password" className={styles.label}>비밀번호</label>
              <input
                id="password"
                className={styles.input}
                type="password"
                autoComplete="new-password"
                placeholder="비밀번호"
                value={form.password}
                onChange={(e) => {
                  set("password", e.target.value);
                  onClearError?.("password");
                }}
              />
            </div>
            {uiErrors.password && <p className={styles.error}>{uiErrors.password}</p>}

            {/* 비밀번호 확인 */}
            <div className={styles.row}>
              <label htmlFor="password2" className={styles.label}>비밀번호 확인</label>
              <input
                id="password2"
                className={styles.input}
                type="password"
                autoComplete="new-password"
                placeholder="비밀번호 확인"
                value={form.password2}
                onChange={(e) => {
                  set("password2", e.target.value);
                  onClearError?.("password2");
                }}
              />
            </div>
            {uiErrors.password2 && <p className={styles.error}>{uiErrors.password2}</p>}

            {/* 이름 */}
            <div className={styles.row}>
              <label htmlFor="name" className={styles.label}>이름</label>
              <input
                id="name"
                className={styles.input}
                placeholder="이름"
                value={form.name}
                onChange={(e) => {
                  set("name", e.target.value);
                  onClearError?.("name");
                }}
              />
            </div>
            {uiErrors.name && <p className={styles.error}>{uiErrors.name}</p>}

            {/* 생년월일 */}
            <div className={styles.row}>
              <span className={styles.label}>생년월일</span>
              <div className={styles.triple}>
                <input
                  id="birthYear"
                  className={styles.input}
                  placeholder="년(4자)"
                  inputMode="numeric"
                  maxLength={4}
                  value={form.birthYear}
                  onChange={(e) => {
                    set("birthYear", e.target.value.replace(/\D/g, ""));
                    onClearError?.("birth");
                  }}
                />
                <input
                  id="birthMonth"
                  className={styles.input}
                  placeholder="월"
                  inputMode="numeric"
                  maxLength={2}
                  value={form.birthMonth}
                  onChange={(e) => {
                    set("birthMonth", e.target.value.replace(/\D/g, ""));
                    onClearError?.("birth");
                  }}
                />
                <input
                  id="birthDay"
                  className={styles.input}
                  placeholder="일"
                  inputMode="numeric"
                  maxLength={2}
                  value={form.birthDay}
                  onChange={(e) => {
                    set("birthDay", e.target.value.replace(/\D/g, ""));
                    onClearError?.("birth");
                  }}
                />
              </div>
            </div>
            {uiErrors.birth && <p className={styles.error}>{uiErrors.birth}</p>}

            {/* 성별 */}
            <div className={styles.row}>
              <label htmlFor="gender" className={styles.label}>성별</label>
              <select
                id="gender"
                className={styles.select}
                value={form.gender}
                onChange={(e) => {
                  set("gender", e.target.value as SignUpForm["gender"]);
                  onClearError?.("gender");
                }}
              >
                <option value="">선택</option>
                <option value="male">남성</option>
                <option value="female">여성</option>
              </select>
            </div>
            {uiErrors.gender && <p className={styles.error}>{uiErrors.gender}</p>}

            {/* 이메일 */}
            <div className={styles.row}>
              <label htmlFor="email" className={styles.label}>이메일</label>
              <div className={styles.inlineOut}>
                <input
                  id="email"
                  className={styles.input}
                  type="email"
                  autoComplete="email"
                  placeholder="이메일"
                  value={form.email}
                  onChange={(e) => {
                    set("email", e.target.value);
                    setEmailChecked(null);
                    setLocalErrors((er) => ({ ...er, email: undefined }));
                    onClearError?.("email");
                  }}
                />
                <button
                  type="button"
                  className={styles.sideBtn}
                  onClick={handleCheckEmail}
                  disabled={checkingEmail || !form.email.trim()}
                  aria-label="이메일 중복확인"
                  title="Email 중복확인"
                >
                  {checkingEmail ? "확인중…" : "Email 중복확인"}
                </button>
              </div>
            </div>
            {uiErrors.email && <p className={styles.error}>{uiErrors.email}</p>}
            {emailChecked === true && <p className={styles.ok}>사용 가능한 이메일입니다.</p>}

            {/* 약관 동의 */}
            <label className={styles.terms}>
              <input
                type="checkbox"
                checked={form.agree}
                onChange={(e) => {
                  set("agree", e.target.checked);
                  onClearError?.("agree");
                }}
              />
              <span>이용약관 개인정보 수집 및 정보이용에 동의합니다.</span>
            </label>
            {uiErrors.agree && <p className={styles.error}>{uiErrors.agree}</p>}

            {/* 제출 */}
            <button className={styles.submit} type="submit" disabled={loading}>
              {loading ? "처리 중…" : "가입하기"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
