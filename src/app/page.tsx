import type { Metadata } from "next";
import Header from "@/components/Header";
import Hero from "@/components/hero/Hero";
import Manifest from "@/components/manifest/Manifest";
import Dossier from "@/components/dossier/Dossier";
import Departments from "@/components/departments/Departments";
import Protocol from "@/components/protocol/Protocol";
import Refusal from "@/components/refusal/Refusal";
import Contract from "@/components/contract/Contract";
import Faq from "@/components/faq/Faq";
import Brief from "@/components/brief/Brief";
import Footer from "@/components/footer/Footer";
import Seam from "@/components/seam/Seam";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "Маркетинговое агентство «Корпорация»: реклама, карты, сайты",
  description:
    "Маркетинговое агентство Даниила Карацапова: контекст, таргет, карты, сайты и сквозная аналитика. В digital с 2019 года, 22 кейса с измеримым результатом.",
  path: "/",
  og: "home",
});

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Manifest />
        <Seam from="light" to="dark" label="Досье" />
        <Dossier />
        <Seam from="dark" to="light" label="Отделы" />
        <Departments />
        <Seam from="light" to="dark" label="Протокол" />
        <Protocol />
        <Seam from="dark" to="light" label="Допуск" />
        <Refusal />
        <Seam from="light" to="dark" label="Контракт" />
        <Contract />
        <Seam from="dark" to="light" label="Справочная" />
        <Faq />
        <Seam from="light" to="dark" label="Новое дело" />
        <Brief />
      </main>
      <Footer />
    </>
  );
}
