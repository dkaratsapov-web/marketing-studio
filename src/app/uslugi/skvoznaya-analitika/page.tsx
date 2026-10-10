import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/footer/Footer";
import Seam from "@/components/seam/Seam";
import JsonLd from "@/components/JsonLd";
import AnalyticsHero from "@/components/analytics/AnalyticsHero";
import Leaks from "@/components/analytics/Leaks";
import CallTracking from "@/components/analytics/CallTracking";
import Dashboard from "@/components/analytics/Dashboard";
import SheetEstimate from "@/components/analytics/SheetEstimate";
import FlapBoard from "@/components/analytics/FlapBoard";
import Padlocks from "@/components/analytics/Padlocks";
import ReportFaq from "@/components/analytics/ReportFaq";
import DiagnosticBrief from "@/components/analytics/DiagnosticBrief";
import { breadcrumbs, faqPage, pageMeta, service } from "@/lib/seo";
import { ANALYTICS } from "@/content/analytics";

const TITLE = "Сквозная аналитика и коллтрекинг под ключ | Корпорация";
const DESCRIPTION =
  "Свяжем рекламу, сайт, звонки и CRM за 5–10 дней: цели в Метрике, коллтрекинг, учёт заявок и дашборд окупаемости. Работа от 12 000 ₽ в месяц.";
const PATH = "/uslugi/skvoznaya-analitika/";

export const metadata: Metadata = pageMeta({ title: TITLE, description: DESCRIPTION, path: PATH, og: "analytics" });

// Микроразметка: услуга с ценой из прайса, хлебные крошки, вопросы
const LD = [
  service({ name: ANALYTICS.name, type: "Веб-аналитика", description: DESCRIPTION, path: PATH, price: 12000 }),
  breadcrumbs([
    { name: "Корпорация", path: "/" },
    { name: ANALYTICS.name, path: PATH },
  ]),
  faqPage(ANALYTICS.faq.items),
];

export default function AnalyticsPage() {
  return (
    <>
      <Header />
      <main>
        <JsonLd data={LD} />
        <AnalyticsHero data={ANALYTICS} />
        <Seam from="dark" to="light" label="Утечки" />
        <Leaks data={ANALYTICS.leaks} />
        <Seam from="light" to="dark" label="Звонки" />
        <CallTracking data={ANALYTICS.calls} />
        <Seam from="dark" to="light" label="Дашборд" />
        <Dashboard data={ANALYTICS.dashboard} />
        <Seam from="light" to="dark" label="Смета" />
        <SheetEstimate data={ANALYTICS.estimate} />
        <Seam from="dark" to="light" label="Дела" />
        <FlapBoard data={ANALYTICS.cases} />
        <Seam from="light" to="dark" label="Отказ" />
        <Padlocks data={ANALYTICS.refusal} />
        <Seam from="dark" to="light" label="Вопросы" />
        <ReportFaq data={ANALYTICS.faq} />
        <Seam from="light" to="dark" label="Диагностика" />
        <DiagnosticBrief data={ANALYTICS.brief} service={ANALYTICS.name} />
      </main>
      <Footer />
    </>
  );
}
