import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/footer/Footer";
import Seam from "@/components/seam/Seam";
import JsonLd from "@/components/JsonLd";
import AvtoHero from "@/components/avto/AvtoHero";
import Inspection from "@/components/avto/Inspection";
import Showroom from "@/components/avto/Showroom";
import DealViews from "@/components/avto/DealViews";
import RoadTrip from "@/components/avto/RoadTrip";
import RegDoc from "@/components/avto/RegDoc";
import WindowSticker from "@/components/avto/WindowSticker";
import OwnerManual from "@/components/avto/OwnerManual";
import TestDriveBrief from "@/components/avto/TestDriveBrief";
import { breadcrumbs, faqPage, pageMeta, service } from "@/lib/seo";
import { AVTO } from "@/content/avtobiznes";

const TITLE = "Маркетинг для автобизнеса и импорта авто | Корпорация";
const DESCRIPTION =
  "Каталог авто на автопилоте, фиды в Директ, Яндекс Бизнес и 2ГИС, Telegram-бот и CRM с воронкой под импорт и ссылкой для клиента. В деле 023: 284 авто без ручного ввода, 5 547 визитов за 90 дней.";
const PATH = "/otrasli/avtobiznes/";

export const metadata: Metadata = pageMeta({ title: TITLE, description: DESCRIPTION, path: PATH, og: "avto" });

// Микроразметка: услуга для отрасли, хлебные крошки, вопросы
const LD = [
  {
    ...service({ name: AVTO.name, type: "Маркетинг для автобизнеса", description: DESCRIPTION, path: PATH, price: 20000 }),
    audience: { "@type": "BusinessAudience", audienceType: "Автосалоны и импортёры автомобилей" },
  },
  breadcrumbs([
    { name: "Корпорация", path: "/" },
    { name: AVTO.name, path: PATH },
  ]),
  faqPage(AVTO.faq.items),
];

export default function AvtoPage() {
  return (
    <>
      <Header />
      <main>
        <JsonLd data={LD} />
        <AvtoHero data={AVTO} />
        <Seam from="dark" to="light" label="Осмотр" />
        <Inspection data={AVTO.inspect} />
        <Seam from="light" to="dark" label="Шоурум" />
        <Showroom data={AVTO.showroom} />
        <Seam from="dark" to="light" label="CRM" />
        <DealViews data={AVTO.crm} />
        <Seam from="light" to="dark" label="Маршрут" />
        <RoadTrip data={AVTO.route} />
        <Seam from="dark" to="light" label="Дело 023" />
        <RegDoc data={AVTO.doc} />
        <Seam from="light" to="dark" label="Цены" />
        <WindowSticker data={AVTO.sticker} service={AVTO.name} />
        <Seam from="dark" to="light" label="Вопросы" />
        <OwnerManual data={AVTO.faq} />
        <Seam from="light" to="dark" label="Тест-драйв" />
        <TestDriveBrief data={AVTO.brief} service={AVTO.name} />
      </main>
      <Footer />
    </>
  );
}
