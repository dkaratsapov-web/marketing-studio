import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/footer/Footer";
import Seam from "@/components/seam/Seam";
import JsonLd from "@/components/JsonLd";
import IpapaHero from "@/components/ipapa/IpapaHero";
import TaskChat from "@/components/ipapa/TaskChat";
import PriceWatch from "@/components/ipapa/PriceWatch";
import AppGallery from "@/components/ipapa/AppGallery";
import TradeIn from "@/components/ipapa/TradeIn";
import SyncPipe from "@/components/ipapa/SyncPipe";
import PriceTags from "@/components/ipapa/PriceTags";
import { IPAPA } from "@/content/ipapa";
import { absoluteUrl, breadcrumbs, ORG_ID, pageMeta } from "@/lib/seo";

const TITLE = "Кейс айпапа.рф: магазин техники внутри Telegram | Корпорация";
const DESCRIPTION =
  "Дело 010: Telegram-бот с подпиской на цену, мини-приложение с каталогом, трейд-ином и записью в сервис, реклама в Директе и Telegram Ads. 869 товаров, обновление каждый час.";
const PATH = "/kejsy/ipapa/";

export const metadata: Metadata = pageMeta({ title: TITLE, description: DESCRIPTION, path: PATH, og: "ipapa", type: "article" });

// Микроразметка: кейс как статья агентства и хлебные крошки
const LD = [
  {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Кейс айпапа.рф: магазин техники внутри Telegram",
    description: DESCRIPTION,
    url: absoluteUrl(PATH),
    image: absoluteUrl("/og/ipapa.jpg"),
    inLanguage: "ru-RU",
    author: { "@type": "Person", name: "Даниил" },
    publisher: { "@id": ORG_ID },
    about: { "@type": "Organization", name: "айпапа.рф" },
  },
  breadcrumbs([
    { name: "Корпорация", path: "/" },
    { name: "Кейсы", path: "/kejsy/" },
    { name: "Кейс айпапа.рф", path: PATH },
  ]),
];

const OTHERS = [
  { href: "/kejsy/diauto69/", text: "Дело 023: ДиАвто69, Telegram-канал стал системой продаж" },
  { href: "/kejsy/sfera/", text: "Дело 004: «Сфера», маркетинг проектной компании целиком" },
  { href: "/uslugi/razrabotka-sajtov/", text: "Разработка сайтов, ботов и приложений" },
];

export default function IpapaCasePage() {
  return (
    <>
      <Header />
      <main>
        <JsonLd data={LD} />
        <IpapaHero data={IPAPA} />
        <Seam from="dark" to="light" label="Задача" />
        <TaskChat data={IPAPA.task} />
        <Seam from="light" to="dark" label="Бот" />
        <PriceWatch data={IPAPA.bot} />
        <Seam from="dark" to="light" label="Мини-приложение" />
        <AppGallery data={IPAPA.app} />
        <Seam from="light" to="dark" label="Трейд-ин" />
        <TradeIn data={IPAPA.tradein} />
        <Seam from="dark" to="light" label="Автоматизация" />
        <SyncPipe data={IPAPA.sync} />
        <Seam from="light" to="dark" label="Результат" />
        <PriceTags data={IPAPA.result} client={IPAPA.client} others={OTHERS} />
      </main>
      <Footer />
    </>
  );
}
