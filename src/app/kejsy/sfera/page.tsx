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
import { SFERA } from "@/content/sfera";

export const metadata: Metadata = {
  title: "Кейс «Сфера»: сайт, Директ, аналитика и ИИ-агент для проектной компании | Корпорация",
  description:
    "Дело 004. Собрали проектной компании «Сфера» маркетинг целиком: сайт на 121 страницу под спрос, Яндекс Директ, связанный с аналитикой, ИИ-агента по рекламе, контент и боты.",
  alternates: { canonical: "/kejsy/sfera/" },
};

export default function SferaCasePage() {
  return (
    <>
      <Header />
      <main>
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
      </main>
      <Footer />
    </>
  );
}
