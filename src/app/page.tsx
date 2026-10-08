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

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Manifest />
        <Dossier />
        <Departments />
        <Protocol />
        <Refusal />
        <Contract />
        <Faq />
        <Brief />
      </main>
      <Footer />
    </>
  );
}
