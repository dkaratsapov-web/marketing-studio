import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/footer/Footer";
import Seam from "@/components/seam/Seam";
import JsonLd from "@/components/JsonLd";
import AboutHero from "@/components/about/AboutHero";
import RulesDrum from "@/components/about/RulesDrum";
import Radar from "@/components/about/Radar";
import Badges from "@/components/about/Badges";
import TorchCases from "@/components/about/TorchCases";
import VisitorPass from "@/components/about/VisitorPass";
import { breadcrumbs, ORG_ID, pageMeta, SITE_URL } from "@/lib/seo";
import { ABOUT } from "@/content/about";

const TITLE = "О Корпорации: маркетинговое агентство Даниила Карацапова";
const DESCRIPTION =
  "Пять отделов под одной крышей: стратегия, контекст и карты, таргет, разработка и приёмная. В digital с 2019 года, 22 кейса с измеримым результатом, работаем по всей России.";
const PATH = "/o-nas/";

export const metadata: Metadata = pageMeta({ title: TITLE, description: DESCRIPTION, path: PATH, og: "about" });

// Микроразметка: страница «О нас» об организации, хлебные крошки
const LD = [
  {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}${PATH}`,
    inLanguage: "ru",
    about: { "@id": ORG_ID },
  },
  breadcrumbs([
    { name: "Корпорация", path: "/" },
    { name: ABOUT.sector, path: PATH },
  ]),
];

export default function AboutPage() {
  return (
    <>
      <Header />
      <main>
        <JsonLd data={LD} />
        <AboutHero data={ABOUT} />
        <Seam from="dark" to="light" label="Правила" />
        <RulesDrum data={ABOUT.rules} />
        <Seam from="light" to="dark" label="География" />
        <Radar data={ABOUT.radar} />
        <Seam from="dark" to="light" label="Команда" />
        <Badges data={ABOUT.team} />
        <Seam from="light" to="dark" label="Дела" />
        <TorchCases data={ABOUT.cases} />
        <Seam from="dark" to="light" label="Пропуск" />
        <VisitorPass data={ABOUT.visit} />
      </main>
      <Footer />
    </>
  );
}
