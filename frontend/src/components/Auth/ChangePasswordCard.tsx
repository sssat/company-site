import { useMemo, useState } from "react";
import styles from "./ChangePasswordCard.module.css";

type Props = {
  cardWidth?: number | string;
  onSubmit?: (payload: { newPassword: string; confirmPassword: string }) => Promise<void> | void;
};

export default function ChangePasswordCard({ cardWidth = 420, onSubmit }: Props) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({});

  type Vars = React.CSSProperties & { ["--card-width"]?: string };
  const vars: Vars = useMemo(
    () => ({ ["--card-width"]: typeof cardWidth === "number" ? `${cardWidth}px` : String(cardWidth) }),
    [cardWidth]
  );

  const validate = () => {
    const e: typeof errors = {};
    if (!newPassword) e.newPassword = "새 비밀번호를 입력해주세요.";
    if (!confirmPassword) e.confirmPassword = "새 비밀번호를 한 번 더 입력해주세요.";
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      e.confirmPassword = "비밀번호가 일치하지 않습니다.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (onSubmit) {
        await onSubmit({ newPassword: newPassword.trim(), confirmPassword: confirmPassword.trim() });
      } else {
        await new Promise((r) => setTimeout(r, 500));
        alert("비밀번호가 변경되었습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.wrap} style={vars}>
        <div className={styles.card}>
          <h1 className={styles.title}>비밀번호 변경</h1>

          <form className={styles.form} onSubmit={submit} noValidate>
            {/* 새 비밀번호 */}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="newPassword">새 비밀번호</label>
              <div className={styles.inputCol}>
                <input
                  id="newPassword"
                  className={styles.input}
                  type="password"
                  placeholder="새 비밀번호를 입력하세요"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
                {errors.newPassword && <p className={styles.error}>{errors.newPassword}</p>}
              </div>
            </div>

            {/* 새 비밀번호 확인 */}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="confirmPassword">새 비밀번호 확인</label>
              <div className={styles.inputCol}>
                <input
                  id="confirmPassword"
                  className={styles.input}
                  type="password"
                  placeholder="새 비밀번호를 한 번 더 입력하세요"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
                {errors.confirmPassword && <p className={styles.error}>{errors.confirmPassword}</p>}
              </div>
            </div>

            <button className={styles.submit} type="submit" disabled={loading}>
              {loading ? "처리 중…" : "확인"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
