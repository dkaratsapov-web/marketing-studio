import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/footer/Footer";
import Thanks from "@/components/thanks/Thanks";

// Страница после отправки формы: цель «Заявка» в Метрике и рекламе. В поиске её нет, в карту сайта не входит
export const metadata: Metadata = {
  title: "Спасибо, заявка принята",
  description: "Заявка у нас: перезвоним в течение часа в рабочее время.",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function ThanksPage() {
  return (
    <>
      <Header />
      <main>
        <Thanks />
      </main>
      <Footer />
    </>
  );
}
