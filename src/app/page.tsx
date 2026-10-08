import Header from "@/components/Header";
import Hero from "@/components/hero/Hero";
import Manifest from "@/components/manifest/Manifest";
import Dossier from "@/components/dossier/Dossier";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Manifest />
        <Dossier />
        {/* Временная заглушка: следующий блок появится после согласования досье */}
        <section id="departments" data-surface="light" style={{ paddingBlock: "var(--section-y)" }}>
          <div className="wrap" style={{ display: "grid", gap: "1rem" }}>
            <p className="label">Следующий блок</p>
            <p style={{ maxWidth: "40ch", fontSize: "var(--step-2)", lineHeight: 1.25 }}>
              Отделы появятся здесь после согласования досье.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
