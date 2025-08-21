import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import HeroSlider from "../components/HeroSlider/HeroSlider";
import ContactForm from "../components/ContactOnly/ContactForm";
import Faq from "../components/ContactOnly/Faq";
import DirectionsSection from "../components/DirectionSection/DirectionsSection";
import ContactButton from "../components/ContactButton/ContactButton";

/** type guard: location.state 에 smoothTo가 있는지 안전하게 체크 */
type ContactState = { smoothTo?: "contact" };
function hasSmoothTo(state: unknown): state is ContactState {
  return typeof state === "object" && state !== null && "smoothTo" in state;
}

export default function Contact() {
  const location = useLocation();

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
      <ContactForm />
      <Faq />
      <DirectionsSection />
      <ContactButton to="/contact" topGap={40} label="문의하기" />
    </>
  );
}
