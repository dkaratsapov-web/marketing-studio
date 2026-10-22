import type { Metadata } from "next";
import AdBrief from "@/components/adbrief/AdBrief";

// Страница для клиентов по прямой ссылке: в поиске её нет, в карту сайта она не входит
export const metadata: Metadata = {
  title: "Бриф на размещение рекламы",
  description: "Анкета для расчёта рекламной кампании: компания, аудитория, площадки, бюджет и сроки.",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  openGraph: { title: "Бриф на размещение рекламы | Корпорация", images: ["/og/home.jpg"] },
};

export default function BriefPage() {
  return <AdBrief />;
}
