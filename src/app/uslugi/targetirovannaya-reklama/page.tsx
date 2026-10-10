import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/footer/Footer";
import Seam from "@/components/seam/Seam";
import TargetHero from "@/components/target/TargetHero";
import Platforms from "@/components/target/Platforms";
import Aim from "@/components/target/Aim";
import { TARGET } from "@/content/target";

export const metadata: Metadata = {
  title: "Таргетированная реклама VK Ads, Telegram Ads, Avito Ads | Корпорация",
  description:
    "Настроим таргет во ВКонтакте, Telegram и на Авито за 4–6 дней: аудитория, креативы под каждую площадку, A/B-тесты и еженедельный отчёт по заявкам. Работа отдела от 20 000 ₽ в месяц.",
  alternates: { canonical: "/uslugi/targetirovannaya-reklama/" },
};

export default function TargetPage() {
  return (
    <>
      <Header />
      <main>
        <TargetHero data={TARGET} />
        <Seam from="dark" to="light" label="Площадки" />
        <Platforms platforms={TARGET.platforms} />
        <Seam from="light" to="dark" label="Аудитория" />
        <Aim aim={TARGET.aim} />
      </main>
      <Footer />
    </>
  );
}
