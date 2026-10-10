import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/footer/Footer";
import Seam from "@/components/seam/Seam";
import JsonLd from "@/components/JsonLd";
import { breadcrumbs, faqPage, pageMeta, service } from "@/lib/seo";
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

const TITLE = "Таргетированная реклама VK, Telegram и Авито | Корпорация";
const DESCRIPTION =
  "Таргет во ВКонтакте, Telegram и на Авито за 4–6 дней: аудитория, креативы, A/B-тесты и отчёт по заявкам каждую неделю. От 20 000 ₽ в месяц.";
const PATH = "/uslugi/targetirovannaya-reklama/";

export const metadata: Metadata = pageMeta({ title: TITLE, description: DESCRIPTION, path: PATH, og: "target" });

// Микроразметка: услуга с ценой из прайса, хлебные крошки, вопросы
const LD = [
  service({ name: TARGET.name, type: "Таргетированная реклама", description: DESCRIPTION, path: PATH, price: 20000 }),
  breadcrumbs([
    { name: "Корпорация", path: "/" },
    { name: TARGET.name, path: PATH },
  ]),
  faqPage(TARGET.faq.items),
];

export default function TargetPage() {
  return (
    <>
      <Header />
      <main>
        <JsonLd data={LD} />
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
