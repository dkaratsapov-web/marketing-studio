import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/footer/Footer";
import LegalPage from "@/components/legal/LegalPage";
import { pageMeta } from "@/lib/seo";
import { CONSENT } from "@/content/legal";

const PATH = "/soglasie-na-obrabotku-dannyh/";

// Правовой документ: открыт всем, в поиске не нужен
export const metadata: Metadata = {
  ...pageMeta({ title: CONSENT.title, description: CONSENT.description, path: PATH, og: "home" }),
  robots: { index: false, follow: true },
};

export default function ConsentPage() {
  return (
    <>
      <Header />
      <main>
        <LegalPage doc={CONSENT} path={PATH} />
      </main>
      <Footer />
    </>
  );
}
