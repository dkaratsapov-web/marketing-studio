import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/footer/Footer";
import Seam from "@/components/seam/Seam";
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

export const metadata: Metadata = {
  title: "Продвижение на Яндекс Картах, в 2ГИС и Яндекс Бизнесе | Корпорация",
  description:
    "Заполним карточки в Яндекс Картах, 2ГИС и Яндекс Бизнесе за 3–7 дней: фото, цены, часы, ответы на отзывы, рекламная подписка и отчёт по звонкам и маршрутам. Работа от 20 000 ₽ в месяц.",
  alternates: { canonical: "/uslugi/karty-i-geoservisy/" },
};

export default function GeoPage() {
  return (
    <>
      <Header />
      <main>
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
