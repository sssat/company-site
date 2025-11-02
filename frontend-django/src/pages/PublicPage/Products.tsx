import HeroSlider from "../../components/HeroSlider/HeroSlider";
import AdminRoleNotice from "../../components/AdminRoleNotice/AdminRoleNotice";
import ProductsIntro from "../../components/ProductsOnly/ProductsIntro";
import ProductCards from "../../components/ProductsOnly/ProductCards";
import ContactButton from "../../components/ContactButton/ContactButton";

export default function Products() {
  return (
    <>
      <HeroSlider />
      <AdminRoleNotice />  {/* 관리자/슈퍼관리자일 때만 표시되는 알림 (hero 바로 아래) */}
      <ProductsIntro />
      <ProductCards />
      <ContactButton to="/contact" topGap={40} label="문의하기" />
    </>
  );
}
