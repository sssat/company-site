import HeroSlider from "../components/HeroSlider/HeroSlider";
import FeatureIntro from "../components/HomeOnly/FeatureIntro";
import InnovationSection from "../components/HomeOnly/InnovationSection";
import HistorySection from "../components/HomeOnly/HistorySection"; 
import DirectionsSection from "../components/DirectionSection/DirectionsSection";
import ContactButton from "../components/ContactButton/ContactButton";

export default function Home() {
  return (
    <>
      <HeroSlider />
      <FeatureIntro />
      <InnovationSection />
      <HistorySection /> 
      <DirectionsSection />
      <ContactButton to="/contact" topGap={40} label="문의하기" />
    </>
  );
}