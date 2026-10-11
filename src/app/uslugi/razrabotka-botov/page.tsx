import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/footer/Footer";
import Seam from "@/components/seam/Seam";
import JsonLd from "@/components/JsonLd";
import BotsHero from "@/components/bots/BotsHero";
import KitGraph from "@/components/bots/KitGraph";
import Levels from "@/components/bots/Levels";
import CaseForward from "@/components/bots/CaseForward";
import Sprint from "@/components/bots/Sprint";
import CommandFaq from "@/components/bots/CommandFaq";
import BotBrief from "@/components/bots/BotBrief";
import { breadcrumbs, faqPage, pageMeta, service } from "@/lib/seo";
import { BOTS } from "@/content/bots";

const TITLE = "Разработка ботов и мини-приложений в Telegram и MAX | Корпорация";
const DESCRIPTION =
  "Боты, мини-приложения и голосовые ассистенты в Telegram и MAX: каталог, заявки, подписки, CRM. Магазин айпапа.рф собрали за 2 недели. Стоимость по смете после брифа.";
const PATH = `/uslugi/${BOTS.slug}/`;

export const metadata: Metadata = pageMeta({ title: TITLE, description: DESCRIPTION, path: PATH, og: "bots" });

// Микроразметка: услуга без цены (в прайсе её нет), хлебные крошки, вопросы
const LD = [
  service({ name: BOTS.name, type: "Разработка чат-ботов и мини-приложений", description: DESCRIPTION, path: PATH }),
  breadcrumbs([
    { name: "Корпорация", path: "/" },
    { name: BOTS.name, path: PATH },
  ]),
  faqPage(BOTS.faq.items),
];

export default function BotsPage() {
  return (
    <>
      <Header />
      <main>
        <JsonLd data={LD} />
        <BotsHero data={BOTS} />
        <Seam from="dark" to="light" label="Модули" />
        <KitGraph data={BOTS.kit} />
        <Seam from="light" to="dark" label="Уровни" />
        <Levels data={BOTS.levels} />
        <Seam from="dark" to="light" label="Дела" />
        <CaseForward data={BOTS.cases} />
        <Seam from="light" to="dark" label="Сроки" />
        <Sprint data={BOTS.plan} />
        <Seam from="dark" to="light" label="Вопросы" />
        <CommandFaq data={BOTS.faq} />
        <Seam from="light" to="dark" label="Бриф" />
        <BotBrief data={BOTS.brief} service={BOTS.name} />
      </main>
      <Footer />
    </>
  );
}
