import Header from "@/components/Header";
import Hero from "@/components/hero/Hero";
import Manifest from "@/components/manifest/Manifest";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Manifest />
        {/* Временная заглушка: следующий блок появится после согласования манифеста */}
        <section id="dossier" data-surface="dark" style={{ paddingBlock: "var(--section-y)" }}>
          <div className="wrap" style={{ display: "grid", gap: "1rem" }}>
            <p className="label">Следующий блок</p>
            <p style={{ maxWidth: "40ch", fontSize: "var(--step-2)", lineHeight: 1.25 }}>
              Досье с кейсами появится здесь после согласования манифеста.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
