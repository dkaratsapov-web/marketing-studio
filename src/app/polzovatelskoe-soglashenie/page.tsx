import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/footer/Footer";
import LegalPage from "@/components/legal/LegalPage";
import { pageMeta } from "@/lib/seo";
import { TERMS } from "@/content/legal";

const PATH = "/polzovatelskoe-soglashenie/";

// Правовой документ: открыт всем, в поиске не нужен
export const metadata: Metadata = {
  ...pageMeta({ title: TERMS.title, description: TERMS.description, path: PATH, og: "home" }),
  robots: { index: false, follow: true },
};

export default function TermsPage() {
  return (
    <>
      <Header />
      <main>
        <LegalPage doc={TERMS} path={PATH} />
      </main>
      <Footer />
    </>
  );
}
