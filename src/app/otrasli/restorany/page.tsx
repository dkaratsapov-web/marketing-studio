import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/footer/Footer";
import Seam from "@/components/seam/Seam";
import JsonLd from "@/components/JsonLd";
import RestaurantsHero from "@/components/restaurants/RestaurantsHero";
import SlotMachine from "@/components/restaurants/SlotMachine";
import Courses from "@/components/restaurants/Courses";
import BillFolder from "@/components/restaurants/BillFolder";
import WineList from "@/components/restaurants/WineList";
import Chalkboard from "@/components/restaurants/Chalkboard";
import ReserveBrief from "@/components/restaurants/ReserveBrief";
import { breadcrumbs, faqPage, pageMeta, service } from "@/lib/seo";
import { RESTAURANTS } from "@/content/restaurants";

const TITLE = "Маркетинг для ресторанов: брони из карт и поиска | Корпорация";
const DESCRIPTION =
  "Продвижение ресторанов: карты и отзывы, реклама по поводам, бронь в один шаг и аналитика броней. В деле 001: +64% броней за три месяца, чек +19%.";
const PATH = "/otrasli/restorany/";

export const metadata: Metadata = pageMeta({ title: TITLE, description: DESCRIPTION, path: PATH, og: "restaurants" });

// Микроразметка: услуга для отрасли, хлебные крошки, вопросы
const LD = [
  {
    ...service({ name: RESTAURANTS.name, type: "Маркетинг для ресторанов", description: DESCRIPTION, path: PATH, price: 20000 }),
    audience: { "@type": "BusinessAudience", audienceType: "Рестораны и кафе" },
  },
  breadcrumbs([
    { name: "Корпорация", path: "/" },
    { name: RESTAURANTS.name, path: PATH },
  ]),
  faqPage(RESTAURANTS.faq.items),
];

export default function RestaurantsPage() {
  return (
    <>
      <Header />
      <main>
        <JsonLd data={LD} />
        <RestaurantsHero data={RESTAURANTS} />
        <Seam from="dark" to="light" label="Поводы" />
        <SlotMachine data={RESTAURANTS.slots} />
        <Seam from="light" to="dark" label="Подача" />
        <Courses data={RESTAURANTS.courses} />
        <Seam from="dark" to="light" label="Дело 001" />
        <BillFolder data={RESTAURANTS.case} />
        <Seam from="light" to="dark" label="Цены" />
        <WineList data={RESTAURANTS.wine} />
        <Seam from="dark" to="light" label="Вопросы" />
        <Chalkboard data={RESTAURANTS.faq} />
        <Seam from="light" to="dark" label="Бронь" />
        <ReserveBrief data={RESTAURANTS.brief} service={RESTAURANTS.name} />
      </main>
      <Footer />
    </>
  );
}
