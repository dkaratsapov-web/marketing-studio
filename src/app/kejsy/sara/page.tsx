import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/footer/Footer";
import Seam from "@/components/seam/Seam";
import JsonLd from "@/components/JsonLd";
import SaraHero from "@/components/sara/SaraHero";
import NeedVoice from "@/components/sara/NeedVoice";
import ParseDemo from "@/components/sara/ParseDemo";
import TwoChats from "@/components/sara/TwoChats";
import ThemeFan from "@/components/sara/ThemeFan";
import LockScreen from "@/components/sara/LockScreen";
import Details from "@/components/sara/Details";
import Checks from "@/components/sara/Checks";
import { SARA } from "@/content/sara";
import { absoluteUrl, breadcrumbs, ORG_ID, pageMeta } from "@/lib/seo";

const TITLE = "Кейс «Сара»: голосовой ассистент в Telegram и MAX | Корпорация";
const DESCRIPTION =
  "Дело 024: задачи, встречи и клиенты одной фразой голосом. Telegram и MAX на одной базе, мини-приложение, 96 из 96 команд без ИИ, 139 модульных тестов.";
const PATH = "/kejsy/sara/";

export const metadata: Metadata = pageMeta({ title: TITLE, description: DESCRIPTION, path: PATH, og: "sara", type: "article" });

// Микроразметка: кейс как статья агентства и хлебные крошки
const LD = [
  {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Кейс «Сара»: голосовой ассистент маркетолога в Telegram и MAX",
    description: DESCRIPTION,
    url: absoluteUrl(PATH),
    image: absoluteUrl("/og/sara.jpg"),
    inLanguage: "ru-RU",
    author: { "@type": "Person", name: "Даниил" },
    publisher: { "@id": ORG_ID },
  },
  breadcrumbs([
    { name: "Корпорация", path: "/" },
    { name: "Кейсы", path: "/kejsy/" },
    { name: "Кейс «Сара»", path: PATH },
  ]),
];

const OTHERS = [
  { href: "/kejsy/ipapa/", text: "Дело 010: айпапа.рф, магазин внутри Telegram" },
  { href: "/kejsy/diauto69/", text: "Дело 023: ДиАвто69, бот, каталог и CRM" },
  { href: "/kejsy/", text: "Все кейсы" },
];

export default function SaraCasePage() {
  return (
    <>
      <Header />
      <main>
        <JsonLd data={LD} />
        <SaraHero data={SARA} />
        <Seam from="dark" to="light" label="Что было нужно" />
        <NeedVoice data={SARA.need} />
        <Seam from="light" to="dark" label="Разбор фраз" />
        <ParseDemo data={SARA.parse} />
        <Seam from="dark" to="light" label="Два мессенджера" />
        <TwoChats data={SARA.sync} />
        <Seam from="light" to="dark" label="Мини-приложение" />
        <ThemeFan data={SARA.app} />
        <Seam from="dark" to="light" label="Напоминания" />
        <LockScreen data={SARA.remind} />
        <Seam from="light" to="dark" label="Детали" />
        <Details data={SARA.details} />
        <Seam from="dark" to="light" label="Как устроено" />
        <Checks data={SARA.checks} client={SARA.client} others={OTHERS} />
      </main>
      <Footer />
    </>
  );
}
