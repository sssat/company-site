import HeroSlider from "../../components/HeroSlider/HeroSlider";
import NewsList from "../../components/MediaOnly/NewsList";
import ContactButton from "../../components/ContactButton/ContactButton";

export default function Media() {
  return (
    <>
      <HeroSlider />

      {/* 뉴스룸 목록 (탭/검색/페이지네이션 포함) */}
      <NewsList />

      {/* 하단 CTA — Contact 페이지의 문의 섹션으로 스무스 스크롤 */}
      <ContactButton to="/contact" topGap={40} label="문의하기" />
    </>
  );
}
