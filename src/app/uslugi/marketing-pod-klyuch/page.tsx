import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/footer/Footer";
import Seam from "@/components/seam/Seam";
import JsonLd from "@/components/JsonLd";
import TurnkeyHero from "@/components/turnkey/TurnkeyHero";
import Tangle from "@/components/turnkey/Tangle";
import LaunchDial from "@/components/turnkey/LaunchDial";
import Bundle from "@/components/turnkey/Bundle";
import Puzzle from "@/components/turnkey/Puzzle";
import Tickets from "@/components/turnkey/Tickets";
import CardFile from "@/components/turnkey/CardFile";
import TeamBrief from "@/components/turnkey/TeamBrief";
import { breadcrumbs, faqPage, pageMeta, service } from "@/lib/seo";
import { TURNKEY } from "@/content/turnkey";

const TITLE = "Маркетинг под ключ: реклама, сайт и аналитика | Корпорация";
const DESCRIPTION =
  "Контекст, таргет, карты, сайт и сквозная аналитика одной командой. Старт за 1–2 недели, отчёт по продажам каждую неделю. От 65 000 ₽ в месяц.";
const PATH = "/uslugi/marketing-pod-klyuch/";

export const metadata: Metadata = pageMeta({ title: TITLE, description: DESCRIPTION, path: PATH, og: "turnkey" });

// Микроразметка: услуга с ценой из прайса, хлебные крошки, вопросы
const LD = [
  service({ name: TURNKEY.name, type: "Комплексный интернет-маркетинг", description: DESCRIPTION, path: PATH, price: 65000 }),
  breadcrumbs([
    { name: "Корпорация", path: "/" },
    { name: TURNKEY.name, path: PATH },
  ]),
  faqPage(TURNKEY.faq.items),
];

export default function TurnkeyPage() {
  return (
    <>
      <Header />
      <main>
        <JsonLd data={LD} />
        <TurnkeyHero data={TURNKEY} />
        <Seam from="dark" to="light" label="Команда" />
        <Tangle data={TURNKEY.tangle} />
        <Seam from="light" to="dark" label="Запуск" />
        <LaunchDial data={TURNKEY.launch} />
        <Seam from="dark" to="light" label="Смета" />
        <Bundle data={TURNKEY.bundle} />
        <Seam from="light" to="dark" label="Дело 004" />
        <Puzzle data={TURNKEY.puzzle} />
        <Seam from="dark" to="light" label="Отказ" />
        <Tickets data={TURNKEY.refusal} />
        <Seam from="light" to="dark" label="Вопросы" />
        <CardFile data={TURNKEY.faq} />
        <Seam from="dark" to="light" label="Бриф" />
        <TeamBrief data={TURNKEY.brief} service={TURNKEY.name} />
      </main>
      <Footer />
    </>
  );
}
