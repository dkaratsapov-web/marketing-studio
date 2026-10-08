import Header from "@/components/Header";
import Hero from "@/components/hero/Hero";
import Manifest from "@/components/manifest/Manifest";
import Dossier from "@/components/dossier/Dossier";
import Departments from "@/components/departments/Departments";
import Protocol from "@/components/protocol/Protocol";

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
        {/* Временная заглушка: следующий блок появится после согласования протокола */}
        <section id="contract" data-surface="light" style={{ paddingBlock: "var(--section-y)" }}>
          <div className="wrap" style={{ display: "grid", gap: "1rem" }}>
            <p className="label">Следующий блок</p>
            <p style={{ maxWidth: "40ch", fontSize: "var(--step-2)", lineHeight: 1.25 }}>
              Когда нас брать не нужно и условия контракта появятся здесь после согласования
              протокола.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
