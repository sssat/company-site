import styles from "./Footer.module.css";

/* 단일 로고 스트립 이미지 */
import pcLogo from "../../assets/partners/partner_company.png";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      {/* ───────── 파트너 고객사 영역 (배경색 A) ───────── */}
      <section className={styles.partnersBlock}>
        <div className={styles.inner}>
          <h2 className={styles.partnersTitle}>파트너 고객사</h2>
        </div>

        {/* 로고 스트립: 화면 양쪽에 꽉 차게(full-bleed) */}
        <div className={styles.stripWrap}>
          <img className={styles.partnerStrip} src={pcLogo} alt="partner-logos" />
        </div>
      </section>

      {/* ───────── 회사/연락처 영역 (배경색 B) ───────── */}
      <section className={styles.bottomBlock}>
        <div className={styles.inner}>
          <div className={styles.bottom}>
            <address className={styles.company}>
              <strong>(주)마켓스테이지</strong>
              <br />
              대표&nbsp;:&nbsp;조환진
              <br />
              사업자등록번호&nbsp;:&nbsp;222-222-222-22222
              <br />
              주소&nbsp;:&nbsp;서울시 강남구 역삼동 역삼로 28길 34 5층&nbsp;401호
            </address>

            <div className={styles.contact}>
              <h3>CONTACT</h3>
              <br />
              TEL&nbsp;:&nbsp;02-345-4444
              <br />
              E-MAIL&nbsp;:&nbsp;market@ddd.co.kr
            </div>
          </div>
        </div>
      </section>
    </footer>
  );
}
