import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/footer/Footer";
import Seam from "@/components/seam/Seam";
import JsonLd from "@/components/JsonLd";
import RetailHero from "@/components/retail/RetailHero";
import TagRail from "@/components/retail/TagRail";
import HourSync from "@/components/retail/HourSync";
import Unboxing from "@/components/retail/Unboxing";
import EinkLabels from "@/components/retail/EinkLabels";
import SpecSheet from "@/components/retail/SpecSheet";
import CartBrief from "@/components/retail/CartBrief";
import { breadcrumbs, faqPage, pageMeta, service } from "@/lib/seo";
import { RETAIL } from "@/content/retail";

const TITLE = "Маркетинг для магазинов техники и электроники | Корпорация";
const DESCRIPTION =
  "Как магазину техники продавать выгоднее маркетплейса: трейд-ин, гарантия низкой цены и гарантия на устройство в рекламе, Директ по моделям, бот с подпиской на цену и магазин в Telegram. Дело 010: 33% заявок с карточки в Яндекс Бизнесе.";
const PATH = `/otrasli/${RETAIL.slug}/`;

export const metadata: Metadata = pageMeta({ title: TITLE, description: DESCRIPTION, path: PATH, og: "retail" });

// Микроразметка: услуга для отрасли с ценой контекста из прайса, хлебные крошки, вопросы
const LD = [
  {
    ...service({ name: RETAIL.name, type: "Маркетинг для ритейла техники", description: DESCRIPTION, path: PATH, price: 30000 }),
    audience: { "@type": "BusinessAudience", audienceType: "Магазины смартфонов, ноутбуков и электроники" },
  },
  breadcrumbs([
    { name: "Корпорация", path: "/" },
    { name: RETAIL.name, path: PATH },
  ]),
  faqPage(RETAIL.faq.items),
];

export default function RetailPage() {
  return (
    <>
      <Header />
      <main>
        <JsonLd data={LD} />
        <RetailHero data={RETAIL} />
        <Seam from="dark" to="light" label="Ценники" />
        <TagRail data={RETAIL.rail} />
        <Seam from="light" to="dark" label="Синхронизация" />
        <HourSync data={RETAIL.sync} />
        <Seam from="dark" to="light" label="Дело 010" />
        <Unboxing data={RETAIL.box} />
        <Seam from="light" to="dark" label="Цены" />
        <EinkLabels data={RETAIL.labels} />
        <Seam from="dark" to="light" label="Вопросы" />
        <SpecSheet data={RETAIL.faq} product={RETAIL.name} />
        <Seam from="light" to="dark" label="Корзина" />
        <CartBrief data={RETAIL.brief} service={RETAIL.name} />
      </main>
      <Footer />
    </>
  );
}
