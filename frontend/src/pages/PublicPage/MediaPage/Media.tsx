import HeroSlider from "../../../components/HeroSlider/HeroSlider";
import AdminRoleNotice from "../../../components/AdminRoleNotice/AdminRoleNotice";
import NewsList from "../../../components/MediaOnly/NewsList";
import ContactButton from "../../../components/ContactButton/ContactButton";

export default function Media() {
  return (
    <>
      <HeroSlider />

      <AdminRoleNotice />  {/* 관리자/슈퍼관리자일 때만 표시되는 알림 (hero 바로 아래) */}

      {/* 뉴스룸 목록 (탭/검색/페이지네이션 포함) */}
      <NewsList />

      {/* 하단 CTA — Contact 페이지의 문의 섹션으로 스무스 스크롤 */}
      <ContactButton to="/contact" topGap={40} label="문의하기" />
    </>
  );
}
