import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/footer/Footer";
import ServiceHero from "@/components/service/ServiceHero";
import { CONTEXT } from "@/content/services";

export const metadata: Metadata = {
  title: "Контекстная реклама в Яндекс Директ под ключ | Корпорация",
  description:
    "Настроим Яндекс Директ за 3–5 дней: поиск, РСЯ и ретаргетинг. Работа отдела от 30 000 ₽ в месяц, еженедельный отчёт по заявкам и продажам. Ведёт основатель агентства.",
  alternates: { canonical: "/uslugi/kontekstnaya-reklama/" },
};

export default function ContextPage() {
  return (
    <>
      <Header />
      <main>
        <ServiceHero service={CONTEXT} queries={CONTEXT.queries} />
      </main>
      <Footer />
    </>
  );
}
