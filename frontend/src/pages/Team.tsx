import HeroSlider from "../components/HeroSlider/HeroSlider";
import People from "../components/TeamOnly/People";
import Benefits from "../components/TeamOnly/Benefits";
import ContactButton from "../components/ContactButton/ContactButton";

export default function Team() {
  return (
    <>
      <HeroSlider />
      <People />
      <Benefits />
      <ContactButton to="/contact" topGap={40} label="문의하기" />
    </>
  );
}