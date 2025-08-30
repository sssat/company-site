import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import HeroSlider from "../../components/HeroSlider/HeroSlider";
import AdminRoleNotice from "../../components/AdminRoleNotice/AdminRoleNotice";
import ContactForm from "../../components/ContactOnly/ContactForm";
import Faq from "../../components/ContactOnly/Faq";
import DirectionsSection from "../../components/DirectionSection/DirectionsSection";
import ContactButton from "../../components/ContactButton/ContactButton";
import { useAuth } from "../../hooks/useAuth"; // ✅ 추가

/** type guard: location.state 에 smoothTo가 있는지 안전하게 체크 */
type ContactState = { smoothTo?: "contact" };
function hasSmoothTo(state: unknown): state is ContactState {
  return typeof state === "object" && state !== null && "smoothTo" in state;
}

export default function Contact() {
  const location = useLocation();

  // ✅ 관리자/슈퍼관리자 판별
  const { isAuthenticated, role } = useAuth();
  const isManager = isAuthenticated && (role === "ADMIN" || role === "SUPER_ADMIN");

  // /contact 로 진입했을 때 해시나 state 기준으로 문의 섹션으로 스무스 스크롤
  useEffect(() => {
    const goContact =
      location.hash === "#contact" ||
      (hasSmoothTo(location.state) && location.state.smoothTo === "contact");

    if (!goContact) return;

    // DOM이 그려진 뒤 스크롤 (고정 헤더가 있으면 ContactForm.css에 scroll-margin-top 설정)
    const id = requestAnimationFrame(() => {
      document.getElementById("contact")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
    return () => cancelAnimationFrame(id);
  }, [location.hash, location.state]);

  return (
    <>
      <HeroSlider />
      <AdminRoleNotice /> {/* 관리자/슈퍼관리자일 때만 표시되는 알림 (hero 바로 아래) */}
      {/* ✅ 관리자/슈퍼관리자일 때만 우상단 버튼 노출 */}
      <ContactForm
        showAdminLink={isManager}
        adminLinkTo="/contact/board" // 필요 시 경로 바꾸세요
      />
      <Faq />
      <DirectionsSection />
      <ContactButton to="/contact" topGap={40} label="문의하기" />
    </>
  );
}
