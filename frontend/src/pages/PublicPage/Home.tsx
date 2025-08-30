import HeroSlider from "../../components/HeroSlider/HeroSlider";
import AdminRoleNotice from "../../components/AdminRoleNotice/AdminRoleNotice";
import FeatureIntro from "../../components/HomeOnly/FeatureIntro";
import InnovationSection from "../../components/HomeOnly/InnovationSection";
import HistorySection from "../../components/HomeOnly/HistorySection"; 
import DirectionsSection from "../../components/DirectionSection/DirectionsSection";
import ContactButton from "../../components/ContactButton/ContactButton";

export default function Home() {
  return (
    <>
      <HeroSlider />
      <AdminRoleNotice />  {/* 관리자/슈퍼관리자일 때만 표시되는 알림 (hero 바로 아래) */}
      <FeatureIntro />
      <InnovationSection />
      <HistorySection /> 
      <DirectionsSection />
      <ContactButton to="/contact" topGap={40} label="문의하기" />
    </>
  );
}