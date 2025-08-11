import HeroSlider from "../components/HeroSlider/HeroSlider";
import ProductsIntro from "../components/ProductsOnly/ProductsIntro";
import ProductCards from "../components/ProductsOnly/ProductCards";
import ContactButton from "../components/ContactButton/ContactButton";

export default function Products() {
  return (
    <>
      <HeroSlider />
      <ProductsIntro />
      <ProductCards />
      <ContactButton to="/contact" topGap={40} label="문의하기" />
    </>
  );
}
