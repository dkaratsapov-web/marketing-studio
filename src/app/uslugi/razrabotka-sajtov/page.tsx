import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/footer/Footer";
import Seam from "@/components/seam/Seam";
import JsonLd from "@/components/JsonLd";
import WebHero from "@/components/web/WebHero";
import PathDuel from "@/components/web/PathDuel";
import IntentRouter from "@/components/web/IntentRouter";
import BuildLoader from "@/components/web/BuildLoader";
import DrawingEstimate from "@/components/web/DrawingEstimate";
import CaseFan from "@/components/web/CaseFan";
import ErrorCodes from "@/components/web/ErrorCodes";
import KanbanFaq from "@/components/web/KanbanFaq";
import StructureBrief from "@/components/web/StructureBrief";
import { breadcrumbs, faqPage, pageMeta, service } from "@/lib/seo";
import { WEB } from "@/content/web";

const TITLE = "Разработка сайтов и лендингов под заявки | Корпорация";
const DESCRIPTION =
  "Лендинг за 7–14 дней от 60 000 ₽, корпоративный сайт от 120 000 ₽. Прототип под путь клиента, адаптив, формы и квизы, аналитика и SEO-база.";
const PATH = "/uslugi/razrabotka-sajtov/";

export const metadata: Metadata = pageMeta({ title: TITLE, description: DESCRIPTION, path: PATH, og: "web" });

// Микроразметка: услуга с ценой из прайса (за проект), хлебные крошки, вопросы
const LD = [
  { ...service({ name: WEB.name, type: "Разработка сайтов", description: DESCRIPTION, path: PATH, price: 60000 }), offers: { "@type": "Offer", price: 60000, priceCurrency: "RUB", description: "Лендинг от 60 000 ₽, корпоративный сайт от 120 000 ₽, оплата за проект" } },
  breadcrumbs([
    { name: "Корпорация", path: "/" },
    { name: WEB.name, path: PATH },
  ]),
  faqPage(WEB.faq.items),
];

export default function WebPage() {
  return (
    <>
      <Header />
      <main>
        <JsonLd data={LD} />
        <WebHero data={WEB} />
        <Seam from="dark" to="light" label="Продавец" />
        <PathDuel data={WEB.path} />
        <Seam from="light" to="dark" label="Запросы" />
        <IntentRouter data={WEB.intents} />
        <Seam from="dark" to="light" label="Сборка" />
        <BuildLoader data={WEB.build} />
        <Seam from="light" to="dark" label="Смета" />
        <DrawingEstimate data={WEB.estimate} />
        <Seam from="dark" to="light" label="Дела" />
        <CaseFan data={WEB.cases} />
        <Seam from="light" to="dark" label="Отказ" />
        <ErrorCodes data={WEB.refusal} />
        <Seam from="dark" to="light" label="Вопросы" />
        <KanbanFaq data={WEB.faq} />
        <Seam from="light" to="dark" label="Бриф" />
        <StructureBrief data={WEB.brief} service={WEB.name} />
      </main>
      <Footer />
    </>
  );
}
