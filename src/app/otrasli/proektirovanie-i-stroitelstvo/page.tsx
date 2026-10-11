import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/footer/Footer";
import Seam from "@/components/seam/Seam";
import JsonLd from "@/components/JsonLd";
import StroykaHero from "@/components/stroyka/StroykaHero";
import StageSlider from "@/components/stroyka/StageSlider";
import DraftDesk from "@/components/stroyka/DraftDesk";
import WorkLog from "@/components/stroyka/WorkLog";
import CostLayers from "@/components/stroyka/CostLayers";
import Passport from "@/components/stroyka/Passport";
import TenderLots from "@/components/stroyka/TenderLots";
import ExpertFaq from "@/components/stroyka/ExpertFaq";
import DesignBrief from "@/components/stroyka/DesignBrief";
import { breadcrumbs, faqPage, pageMeta, service } from "@/lib/seo";
import { STROYKA } from "@/content/stroyka";

const TITLE = "Маркетинг для проектных и строительных компаний | Корпорация";
const DESCRIPTION =
  "Сайт под спрос, Яндекс Директ, сквозная аналитика, ИИ-ассистент и боты для проектирования и строительства. В деле 004: 121 страница под спрос и 251 вопрос в базе ассистента.";
const PATH = "/otrasli/proektirovanie-i-stroitelstvo/";

export const metadata: Metadata = pageMeta({ title: TITLE, description: DESCRIPTION, path: PATH, og: "stroyka" });

// Микроразметка: услуга для отрасли, хлебные крошки, вопросы
const LD = [
  {
    ...service({ name: STROYKA.name, type: "Маркетинг для проектных и строительных компаний", description: DESCRIPTION, path: PATH, price: 30000 }),
    audience: { "@type": "BusinessAudience", audienceType: "Проектные и строительные компании" },
  },
  breadcrumbs([
    { name: "Корпорация", path: "/" },
    { name: STROYKA.name, path: PATH },
  ]),
  faqPage(STROYKA.faq.items),
];

export default function StroykaPage() {
  return (
    <>
      <Header />
      <main>
        <JsonLd data={LD} />
        <StroykaHero data={STROYKA} />
        <Seam from="dark" to="light" label="Стадии" />
        <StageSlider data={STROYKA.stage} />
        <Seam from="light" to="dark" label="Экраны" />
        <DraftDesk data={STROYKA.desk} />
        <Seam from="dark" to="light" label="Журнал" />
        <WorkLog data={STROYKA.log} />
        <Seam from="light" to="dark" label="Бюджет" />
        <CostLayers data={STROYKA.layers} />
        <Seam from="dark" to="light" label="Дело 004" />
        <Passport data={STROYKA.passport} />
        <Seam from="light" to="dark" label="Цены" />
        <TenderLots data={STROYKA.tender} service={STROYKA.name} />
        <Seam from="dark" to="light" label="Вопросы" />
        <ExpertFaq data={STROYKA.faq} />
        <Seam from="light" to="dark" label="Задание" />
        <DesignBrief data={STROYKA.brief} service={STROYKA.name} />
      </main>
      <Footer />
    </>
  );
}
