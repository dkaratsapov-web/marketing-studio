import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/footer/Footer";
import Seam from "@/components/seam/Seam";
import JsonLd from "@/components/JsonLd";
import { breadcrumbs, faqPage, pageMeta, service } from "@/lib/seo";
import GeoHero from "@/components/geo/GeoHero";
import Layers from "@/components/geo/Layers";
import CompareCard from "@/components/geo/CompareCard";
import Reviews from "@/components/geo/Reviews";
import RouteEstimate from "@/components/geo/RouteEstimate";
import CaseMap from "@/components/geo/CaseMap";
import RoadSigns from "@/components/geo/RoadSigns";
import SearchFaq from "@/components/geo/SearchFaq";
import PinBrief from "@/components/geo/PinBrief";
import { GEO } from "@/content/geo";

const TITLE = "Продвижение на Яндекс Картах и в 2ГИС | Корпорация";
const DESCRIPTION =
  "Карточки в Яндекс Картах, 2ГИС и Яндекс Бизнесе за 3–7 дней: фото, цены, ответы на отзывы и отчёт по звонкам и маршрутам. От 20 000 ₽ в месяц.";
const PATH = "/uslugi/karty-i-geoservisy/";

export const metadata: Metadata = pageMeta({ title: TITLE, description: DESCRIPTION, path: PATH, og: "geo" });

// Микроразметка: услуга с ценой из прайса, хлебные крошки, вопросы
const LD = [
  service({ name: GEO.name, type: "Продвижение на картах", description: DESCRIPTION, path: PATH, price: 20000 }),
  breadcrumbs([
    { name: "Корпорация", path: "/" },
    { name: GEO.name, path: PATH },
  ]),
  faqPage(GEO.faq.items),
];

export default function GeoPage() {
  return (
    <>
      <Header />
      <main>
        <JsonLd data={LD} />
        <GeoHero data={GEO} />
        <Seam from="dark" to="light" label="Площадки" />
        <Layers data={GEO.layers} />
        <Seam from="light" to="dark" label="Карточка" />
        <CompareCard data={GEO.card} />
        <Seam from="dark" to="light" label="Отзывы" />
        <Reviews data={GEO.reviews} />
        <Seam from="light" to="dark" label="Смета" />
        <RouteEstimate data={GEO.estimate} />
        <Seam from="dark" to="light" label="Дела" />
        <CaseMap data={GEO.cases} />
        <Seam from="light" to="dark" label="Отказ" />
        <RoadSigns data={GEO.refusal} />
        <Seam from="dark" to="light" label="Вопросы" />
        <SearchFaq data={GEO.faq} />
        <Seam from="light" to="dark" label="Заявка" />
        <PinBrief data={GEO.brief} service={GEO.name} />
      </main>
      <Footer />
    </>
  );
}
