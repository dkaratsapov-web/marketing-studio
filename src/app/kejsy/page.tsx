import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/footer/Footer";
import JsonLd from "@/components/JsonLd";
import CaseArchive from "@/components/kejsy/CaseArchive";
import { CASES } from "@/content/cases";
import { absoluteUrl, breadcrumbs, pageMeta } from "@/lib/seo";

const TITLE = "Кейсы маркетингового агентства «Корпорация» | Результаты в цифрах";
const DESCRIPTION =
  "Архив дел агентства: проектирование, автобизнес, ритейл техники, медицина, рестораны, бьюти и B2B. Задача, решение и результат в цифрах по каждому делу.";
const PATH = "/kejsy/";

export const metadata: Metadata = pageMeta({ title: TITLE, description: DESCRIPTION, path: PATH, og: "home" });

// Микроразметка: список дел и хлебные крошки
const LD = [
  {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Кейсы агентства «Корпорация»",
    description: DESCRIPTION,
    url: absoluteUrl(PATH),
    inLanguage: "ru-RU",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: CASES.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: `Дело ${c.code}: ${c.title}`,
        ...(c.href ? { url: absoluteUrl(c.href) } : {}),
      })),
    },
  },
  breadcrumbs([
    { name: "Корпорация", path: "/" },
    { name: "Кейсы", path: PATH },
  ]),
];

export default function CasesPage() {
  return (
    <>
      <Header />
      <main>
        <JsonLd data={LD} />
        <CaseArchive />
      </main>
      <Footer />
    </>
  );
}
