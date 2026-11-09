import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/footer/Footer";
import LegalPage from "@/components/legal/LegalPage";
import { pageMeta } from "@/lib/seo";
import { POLICY } from "@/content/legal";

const PATH = "/politika-konfidencialnosti/";

// Правовой документ: открыт всем, в поиске не нужен
export const metadata: Metadata = {
  ...pageMeta({ title: POLICY.title, description: POLICY.description, path: PATH, og: "home" }),
  robots: { index: false, follow: true },
};

export default function PolicyPage() {
  return (
    <>
      <Header />
      <main>
        <LegalPage doc={POLICY} path={PATH} />
      </main>
      <Footer />
    </>
  );
}
