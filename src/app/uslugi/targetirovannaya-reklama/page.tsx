import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/footer/Footer";
import Seam from "@/components/seam/Seam";
import TargetHero from "@/components/target/TargetHero";
import Platforms from "@/components/target/Platforms";
import Aim from "@/components/target/Aim";
import Creatives from "@/components/target/Creatives";
import StoryEstimate from "@/components/target/StoryEstimate";
import Profile from "@/components/target/Profile";
import CaseFlip from "@/components/target/CaseFlip";
import SwipeRefusal from "@/components/target/SwipeRefusal";
import ChatFaq from "@/components/target/ChatFaq";
import AdBrief from "@/components/target/AdBrief";
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
        <Seam from="dark" to="light" label="Креативы" />
        <Creatives data={TARGET.creatives} />
        <Seam from="light" to="dark" label="Смета" />
        <StoryEstimate data={TARGET.estimate} />
        <Seam from="dark" to="light" label="Отдел" />
        <Profile data={TARGET.dossier} head={TARGET.head} />
        <Seam from="light" to="dark" label="Дело 021" />
        <CaseFlip data={TARGET.case} />
        <Seam from="dark" to="light" label="Отказ" />
        <SwipeRefusal data={TARGET.refusal} />
        <Seam from="light" to="dark" label="Вопросы" />
        <ChatFaq data={TARGET.faq} head={TARGET.head.name} />
        <Seam from="dark" to="light" label="Бриф" />
        <AdBrief data={TARGET.brief} service={TARGET.name} />
      </main>
      <Footer />
    </>
  );
}
