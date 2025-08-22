import { useMemo, useState } from "react";
import styles from "./SignUpCard.module.css";
import logo from "../../assets/company_logo/company_logo.svg";

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

type Errors =
  Partial<
    Record<
      | "username"
      | "password"
      | "password2"
      | "name"
      | "birth"
      | "gender"
      | "email"
      | "agree",
      string
    >
  >;

type SignUpCardProps = {
  /** 카드 폭을 숫자(px) 또는 CSS 크기 문자열로 지정 (기본: 360px) */
  cardWidth?: number | string;
  /** 가입 제출 핸들러(연동 시 교체) */
  onSubmit?: (data: SignUpForm) => Promise<void> | void;
  /** ID 중복확인 핸들러(가용하면 true). 미지정 시 모의 함수 사용 */
  onCheckId?: (username: string) => Promise<boolean>;
  /** Email 중복확인 핸들러(가용하면 true). 미지정 시 모의 함수 사용 */
  onCheckEmail?: (email: string) => Promise<boolean>;
};

/* ===== 모의(샘플) 중복확인 핸들러 ===== */
async function mockCheckId(username: string): Promise<boolean> {
  await new Promise((r) => setTimeout(r, 500));
  return username.trim().toLowerCase() !== "admin"; // 'admin'은 이미 사용중으로 가정
}
async function mockCheckEmail(email: string): Promise<boolean> {
  await new Promise((r) => setTimeout(r, 500));
  return !email.toLowerCase().endsWith("@blocked.com"); // 특정 도메인만 불가 예시
}

export default function SignUpCard({
  cardWidth = 360,
  onSubmit,
  onCheckId = mockCheckId,
  onCheckEmail = mockCheckEmail,
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
  const [errors, setErrors] = useState<Errors>({});
  const [checkingId, setCheckingId] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [idChecked, setIdChecked] = useState<boolean | null>(null);
  const [emailChecked, setEmailChecked] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  // CSS 변수(--card-width) 주입
  type StyleVars = React.CSSProperties & { ["--card-width"]?: string };
  const styleVars: StyleVars = useMemo(
    () => ({
      ["--card-width"]:
        typeof cardWidth === "number" ? `${cardWidth}px` : String(cardWidth),
    }),
    [cardWidth]
  );

  const set = <K extends keyof SignUpForm>(key: K, value: SignUpForm[K]) =>
    setForm((s) => ({ ...s, [key]: value }));

  const validate = (): boolean => {
    const e: Errors = {};

    if (!form.username.trim()) e.username = "아이디를 입력해주세요.";
    if (form.password.length < 8)
      e.password = "비밀번호는 8자 이상이어야 합니다.";
    if (form.password2 !== form.password)
      e.password2 = "비밀번호가 일치하지 않습니다.";
    if (!form.name.trim()) e.name = "이름을 입력해주세요.";

    const y = Number(form.birthYear);
    const m = Number(form.birthMonth);
    const d = Number(form.birthDay);
    if (!(y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) {
      e.birth = "생년월일을 올바르게 입력해주세요.";
    }

    if (!form.gender) e.gender = "성별을 선택해주세요.";

    const emailOK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
    if (!emailOK) e.email = "이메일 형식이 올바르지 않습니다.";

    if (!form.agree) e.agree = "이용약관 동의가 필요합니다.";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCheckId = async () => {
    setErrors((e) => ({ ...e, username: undefined }));
    if (!form.username.trim()) {
      setErrors((e) => ({ ...e, username: "아이디를 입력해주세요." }));
      return;
    }
    setCheckingId(true);
    try {
      const ok = await onCheckId(form.username);
      setIdChecked(ok);
      if (!ok) {
        setErrors((e) => ({ ...e, username: "이미 사용 중인 아이디입니다." }));
      }
    } finally {
      setCheckingId(false);
    }
  };

  const handleCheckEmail = async () => {
    setErrors((e) => ({ ...e, email: undefined }));
    const emailOK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
    if (!emailOK) {
      setErrors((e) => ({ ...e, email: "이메일 형식이 올바르지 않습니다." }));
      return;
    }
    setCheckingEmail(true);
    try {
      const ok = await onCheckEmail(form.email);
      setEmailChecked(ok);
      if (!ok) {
        setErrors((e) => ({ ...e, email: "이미 사용 중인 이메일입니다." }));
      }
    } finally {
      setCheckingEmail(false);
    }
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      if (onSubmit) {
        await onSubmit(form);
      } else {
        await new Promise((r) => setTimeout(r, 600));
        alert("회원가입이 완료되었습니다.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "회원가입에 실패했습니다.";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.section} aria-label="회원가입">
      <div className={styles.wrap} style={styleVars}>
        <div className={styles.card}>
          <img src={logo} alt="MARKET STAGE" className={styles.logo} />

          <form className={styles.form} onSubmit={submit} noValidate>
            {/* 아이디: 입력칸 길이 ↓ + 버튼을 밖으로 */}
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
            {errors.username && <p className={styles.error}>{errors.username}</p>}
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
                onChange={(e) => set("password", e.target.value)}
              />
            </div>
            {errors.password && <p className={styles.error}>{errors.password}</p>}

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
                onChange={(e) => set("password2", e.target.value)}
              />
            </div>
            {errors.password2 && <p className={styles.error}>{errors.password2}</p>}

            {/* 이름 */}
            <div className={styles.row}>
              <label htmlFor="name" className={styles.label}>이름</label>
              <input
                id="name"
                className={styles.input}
                placeholder="이름"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>
            {errors.name && <p className={styles.error}>{errors.name}</p>}

            {/* 생년월일 (연/월/일) */}
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
                  onChange={(e) => set("birthYear", e.target.value.replace(/\D/g, ""))}
                />
                <input
                  id="birthMonth"
                  className={styles.input}
                  placeholder="월"
                  inputMode="numeric"
                  maxLength={2}
                  value={form.birthMonth}
                  onChange={(e) => set("birthMonth", e.target.value.replace(/\D/g, ""))}
                />
                <input
                  id="birthDay"
                  className={styles.input}
                  placeholder="일"
                  inputMode="numeric"
                  maxLength={2}
                  value={form.birthDay}
                  onChange={(e) => set("birthDay", e.target.value.replace(/\D/g, ""))}
                />
              </div>
            </div>
            {errors.birth && <p className={styles.error}>{errors.birth}</p>}

            {/* 성별 */}
            <div className={styles.row}>
              <label htmlFor="gender" className={styles.label}>성별</label>
              <select
                id="gender"
                className={styles.select}
                value={form.gender}
                onChange={(e) => set("gender", e.target.value as SignUpForm["gender"])}
              >
                <option value="">선택</option>
                <option value="male">남성</option>
                <option value="female">여성</option>
              </select>
            </div>
            {errors.gender && <p className={styles.error}>{errors.gender}</p>}

            {/* 이메일: 입력칸 길이 ↓ + 버튼을 밖으로 */}
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
            {errors.email && <p className={styles.error}>{errors.email}</p>}
            {emailChecked === true && <p className={styles.ok}>사용 가능한 이메일입니다.</p>}

            {/* 약관 동의 */}
            <label className={styles.terms}>
              <input
                type="checkbox"
                checked={form.agree}
                onChange={(e) => set("agree", e.target.checked)}
              />
              <span>이용약관 개인정보 수집 및 정보이용에 동의합니다.</span>
            </label>
            {errors.agree && <p className={styles.error}>{errors.agree}</p>}

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
