import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/footer/Footer";
import Seam from "@/components/seam/Seam";
import CaseHero from "@/components/case/CaseHero";
import CaseBrief from "@/components/case/CaseBrief";
import SiteMap from "@/components/case/SiteMap";
import Evidence from "@/components/case/Evidence";
import AnalyticsPanel from "@/components/case/AnalyticsPanel";
import AgentScene from "@/components/case/AgentScene";
import ContentLine from "@/components/case/ContentLine";
import VisitorTools from "@/components/case/VisitorTools";
import BotsSeeding from "@/components/case/BotsSeeding";
import CaseFinale from "@/components/case/CaseFinale";
import { SFERA } from "@/content/sfera";
import JsonLd from "@/components/JsonLd";
import { absoluteUrl, breadcrumbs, ORG_ID, pageMeta } from "@/lib/seo";

const TITLE =
  "Кейс «Сфера»: маркетинг проектной компании под ключ | Корпорация";
const DESCRIPTION =
  "Дело 004: маркетинг проектной компании «Сфера» целиком. Сайт на 121 страницу под спрос, Яндекс Директ с аналитикой, ИИ-агент по рекламе и боты.";
const PATH = "/kejsy/sfera/";

export const metadata: Metadata = pageMeta({ title: TITLE, description: DESCRIPTION, path: PATH, og: "sfera", type: "article" });

// Микроразметка: кейс как статья агентства и хлебные крошки
const LD = [
  {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Кейс «Сфера»: маркетинг проектной компании от сайта до ИИ-агента по Директу",
    description: DESCRIPTION,
    url: absoluteUrl(PATH),
    image: absoluteUrl("/og/sfera.jpg"),
    inLanguage: "ru-RU",
    author: { "@type": "Person", name: "Даниил Карацапов" },
    publisher: { "@id": ORG_ID },
    about: { "@type": "Organization", name: "Проектная компания «Сфера»" },
  },
  breadcrumbs([
    { name: "Корпорация", path: "/" },
    { name: "Кейс «Сфера»", path: PATH },
  ]),
];

export default function SferaCasePage() {
  return (
    <>
      <Header />
      <main>
        <JsonLd data={LD} />
        <CaseHero data={SFERA} />
        <Seam from="dark" to="light" label="Клиент" />
        <CaseBrief brief={SFERA.brief} client={SFERA.client} />
        <Seam from="light" to="dark" label="Сайт" />
        <SiteMap map={SFERA.map} />
        <Seam from="dark" to="light" label="Директ" />
        <Evidence evidence={SFERA.evidence} />
        <Seam from="light" to="dark" label="Аналитика" />
        <AnalyticsPanel panel={SFERA.panel} />
        <Seam from="dark" to="light" label="ИИ-агент" />
        <AgentScene agent={SFERA.agent} />
        <Seam from="light" to="dark" label="Контент" />
        <ContentLine content={SFERA.content} />
        <Seam from="dark" to="light" label="Инструменты" />
        <VisitorTools tools={SFERA.tools} />
        <Seam from="light" to="dark" label="Боты" />
        <BotsSeeding bots={SFERA.bots} />
        <Seam from="dark" to="light" label="Служебное" />
        <CaseFinale data={SFERA} />
      </main>
      <Footer />
    </>
  );
}
