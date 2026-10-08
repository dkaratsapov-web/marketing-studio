import Header from "@/components/Header";
import Hero from "@/components/hero/Hero";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        {/* Временная заглушка: следующий блок появится после согласования hero */}
        <section id="dossier" data-surface="light" style={{ paddingBlock: "var(--section-y)" }}>
          <div className="wrap" style={{ display: "grid", gap: "1rem" }}>
            <p className="label">Следующий блок</p>
            <p style={{ maxWidth: "40ch", fontSize: "var(--step-2)", lineHeight: 1.25 }}>
              Манифест и досье появятся здесь после согласования первого экрана.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
