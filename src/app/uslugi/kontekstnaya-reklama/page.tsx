import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/footer/Footer";
import ServiceHero from "@/components/service/ServiceHero";
import NotClicks from "@/components/service/NotClicks";
import Estimate from "@/components/service/Estimate";
import Campaigns from "@/components/service/Campaigns";
import MinusWords from "@/components/service/MinusWords";
import Calendar from "@/components/service/Calendar";
import Seam from "@/components/seam/Seam";
import JsonLd from "@/components/JsonLd";
import { breadcrumbs, pageMeta, service } from "@/lib/seo";
import { CONTEXT } from "@/content/services";

const TITLE = "Контекстная реклама в Яндекс Директ под ключ | Корпорация";
const DESCRIPTION =
  "Настроим Яндекс Директ за 3–5 дней: поиск, РСЯ и ретаргетинг. Работа отдела от 30 000 ₽ в месяц, отчёт по заявкам и продажам каждую неделю.";
const PATH = "/uslugi/kontekstnaya-reklama/";

export const metadata: Metadata = pageMeta({ title: TITLE, description: DESCRIPTION, path: PATH, og: "context" });

// Микроразметка: услуга с ценой из прайса, хлебные крошки
const LD = [
  service({ name: CONTEXT.name, type: "Контекстная реклама", description: DESCRIPTION, path: PATH, price: 30000 }),
  breadcrumbs([
    { name: "Корпорация", path: "/" },
    { name: CONTEXT.name, path: PATH },
  ]),
];

export default function ContextPage() {
  return (
    <>
      <Header />
      <main>
        <JsonLd data={LD} />
        <ServiceHero service={CONTEXT} queries={CONTEXT.queries} />
        <Seam from="dark" to="light" label="Отчёт" />
        <NotClicks report={CONTEXT.report} />
        <Seam from="light" to="dark" label="Смета" />
        <Estimate
          estimate={CONTEXT.estimate}
          calc={CONTEXT.calc}
          service={CONTEXT.name}
          head={CONTEXT.head.name}
          department={CONTEXT.department}
        />
        <Seam from="dark" to="light" label="Кампании" />
        <Campaigns campaigns={CONTEXT.campaigns} />
        <Seam from="light" to="dark" label="Минус-слова" />
        <MinusWords minus={CONTEXT.minus} />
        <Seam from="dark" to="light" label="Протокол" />
        <Calendar calendar={CONTEXT.calendar} />
      </main>
      <Footer />
    </>
  );
}
