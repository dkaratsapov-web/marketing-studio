import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/footer/Footer";
import Seam from "@/components/seam/Seam";
import JsonLd from "@/components/JsonLd";
import DiautoHero from "@/components/diauto/DiautoHero";
import Stickers from "@/components/diauto/Stickers";
import ParserBench from "@/components/diauto/ParserBench";
import FeedRails from "@/components/diauto/FeedRails";
import BotChat from "@/components/diauto/BotChat";
import DealBoard from "@/components/diauto/DealBoard";
import QuizPick from "@/components/diauto/QuizPick";
import AdsAudit from "@/components/diauto/AdsAudit";
import Odometer from "@/components/diauto/Odometer";
import { DIAUTO } from "@/content/diauto";
import { absoluteUrl, breadcrumbs, ORG_ID, pageMeta } from "@/lib/seo";

const TITLE = "Кейс ДиАвто69: Telegram-канал автоимпорта стал системой продаж | Корпорация";
const DESCRIPTION =
  "Дело 023: сайт, каталог на автопилоте из Telegram, бот с мини-приложением, своя CRM, фиды на 4 площадки и сквозная аналитика. 284 авто без ручного ввода, 5 547 визитов за 90 дней.";
const PATH = "/kejsy/diauto69/";

export const metadata: Metadata = pageMeta({ title: TITLE, description: DESCRIPTION, path: PATH, og: "diauto", type: "article" });

// Микроразметка: кейс как статья агентства и хлебные крошки
const LD = [
  {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Кейс ДиАвто69: Telegram-канал импортёра авто превратили в систему продаж",
    description: DESCRIPTION,
    url: absoluteUrl(PATH),
    image: absoluteUrl("/og/diauto.jpg"),
    inLanguage: "ru-RU",
    author: { "@type": "Person", name: "Даниил" },
    publisher: { "@id": ORG_ID },
    about: { "@type": "Organization", name: "ДиАвто69" },
  },
  breadcrumbs([
    { name: "Корпорация", path: "/" },
    { name: "Кейсы", path: "/kejsy/" },
    { name: "Кейс ДиАвто69", path: PATH },
  ]),
];

export default function DiautoCasePage() {
  return (
    <>
      <Header />
      <main>
        <JsonLd data={LD} />
        <DiautoHero data={DIAUTO} />
        <Seam from="dark" to="light" label="Задача" />
        <Stickers data={DIAUTO.task} />
        <Seam from="light" to="dark" label="Каталог" />
        <ParserBench data={DIAUTO.parser} />
        <Seam from="dark" to="light" label="Фиды" />
        <FeedRails data={DIAUTO.feeds} />
        <Seam from="light" to="dark" label="Бот" />
        <BotChat data={DIAUTO.bot} />
        <Seam from="dark" to="light" label="CRM" />
        <DealBoard data={DIAUTO.crm} />
        <Seam from="light" to="dark" label="Квиз" />
        <QuizPick data={DIAUTO.quiz} />
        <Seam from="dark" to="light" label="Аналитика" />
        <AdsAudit data={DIAUTO.ads} />
        <Seam from="light" to="dark" label="Итоги" />
        <Odometer data={DIAUTO.result} period={DIAUTO.period} client={DIAUTO.client} />
      </main>
      <Footer />
    </>
  );
}
