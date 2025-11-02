import HeroSlider from "../../components/HeroSlider/HeroSlider";
import AdminRoleNotice from "../../components/AdminRoleNotice/AdminRoleNotice";
import People from "../../components/TeamOnly/People";
import Benefits from "../../components/TeamOnly/Benefits";
import ContactButton from "../../components/ContactButton/ContactButton";

export default function Team() {
  return (
    <>
      <HeroSlider />
      <AdminRoleNotice />  {/* 관리자/슈퍼관리자일 때만 표시되는 알림 (hero 바로 아래) */}
      <People />
      <Benefits />
      <ContactButton to="/contact" topGap={40} label="문의하기" />
    </>
  );
}