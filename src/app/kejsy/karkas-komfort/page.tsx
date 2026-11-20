import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/footer/Footer";
import Seam from "@/components/seam/Seam";
import JsonLd from "@/components/JsonLd";
import KarkasHero from "@/components/karkas/KarkasHero";
import Before from "@/components/karkas/Before";
import System from "@/components/karkas/System";
import Inventory from "@/components/karkas/Inventory";
import Coverage from "@/components/karkas/Coverage";
import MobileFan from "@/components/karkas/MobileFan";
import LeadRoutes from "@/components/karkas/LeadRoutes";
import AdsChannels from "@/components/karkas/AdsChannels";
import Quality from "@/components/karkas/Quality";
import Speed from "@/components/karkas/Speed";
import KarkasFinale from "@/components/karkas/KarkasFinale";
import { KARKAS } from "@/content/karkas";
import { absoluteUrl, breadcrumbs, ORG_ID, pageMeta } from "@/lib/seo";

const TITLE = "Кейс «Каркас Комфорт»: сайт строительной компании с CRM | Корпорация";
const DESCRIPTION =
  "Дело 025: сайт каркасных домов на 69 страниц с нуля, своя CRM с админкой, реклама в Директе, Авито Ads и Сбер Ads и автоматическая проверка каждой правки.";
const PATH = "/kejsy/karkas-komfort/";

export const metadata: Metadata = pageMeta({ title: TITLE, description: DESCRIPTION, path: PATH, og: "karkas", type: "article" });

const OTHERS = [
  { href: "/kejsy/sfera/", text: "Дело 004: «Сфера», маркетинг проектной компании" },
  { href: "/kejsy/diauto69/", text: "Дело 023: ДиАвто69, бот, каталог и CRM" },
  { href: "/kejsy/sara/", text: "Дело 024: Сара, голосовой ассистент" },
  { href: "/kejsy/", text: "Все кейсы" },
];

const LD = [
  {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Кейс «Каркас Комфорт»: сайт строительной компании с собственной CRM и автоматической проверкой качества",
    description: DESCRIPTION,
    url: absoluteUrl(PATH),
    image: absoluteUrl("/og/karkas.jpg"),
    inLanguage: "ru-RU",
    author: { "@type": "Person", name: "Даниил" },
    publisher: { "@id": ORG_ID },
    about: { "@type": "Organization", name: "Каркас Комфорт" },
  },
  breadcrumbs([
    { name: "Корпорация", path: "/" },
    { name: "Кейсы", path: "/kejsy/" },
    { name: "Кейс «Каркас Комфорт»", path: PATH },
  ]),
];

export default function KarkasCasePage() {
  return (
    <>
      <Header />
      <main>
        <JsonLd data={LD} />
        <KarkasHero data={KARKAS} />
        <Seam from="dark" to="light" label="Было" />
        <Before data={KARKAS.before} />
        <Seam from="light" to="dark" label="Система" />
        <System data={KARKAS.system} />
        <Seam from="dark" to="light" label="Контент" />
        <Inventory data={KARKAS.content} />
        <Seam from="light" to="dark" label="Путь к заявке" />
        <Coverage data={KARKAS.path} />
        <Seam from="dark" to="light" label="Телефон" />
        <MobileFan data={KARKAS.mobile} />
        <Seam from="light" to="dark" label="Заявки и CRM" />
        <LeadRoutes data={KARKAS.crm} />
        <Seam from="dark" to="light" label="Реклама" />
        <AdsChannels data={KARKAS.ads} />
        <Seam from="light" to="dark" label="Качество" />
        <Quality data={KARKAS.quality} />
        <Seam from="dark" to="light" label="Скорость" />
        <Speed data={KARKAS.speed} />
        <Seam from="light" to="light" label="Дальше" />
        <KarkasFinale client={KARKAS.client} others={OTHERS} />
      </main>
      <Footer />
    </>
  );
}
