import Header from "@/components/Header";
import Hero from "@/components/hero/Hero";
import Manifest from "@/components/manifest/Manifest";
import Dossier from "@/components/dossier/Dossier";
import Departments from "@/components/departments/Departments";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Manifest />
        <Dossier />
        <Departments />
        {/* Временная заглушка: следующий блок появится после согласования отделов */}
        <section id="protocol" data-surface="dark" style={{ paddingBlock: "var(--section-y)" }}>
          <div className="wrap" style={{ display: "grid", gap: "1rem" }}>
            <p className="label">Следующий блок</p>
            <p style={{ maxWidth: "40ch", fontSize: "var(--step-2)", lineHeight: 1.25 }}>
              Протокол работы появится здесь после согласования отделов.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
