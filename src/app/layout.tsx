import type { Metadata, Viewport } from "next";
import { Geologica, Golos_Text, IBM_Plex_Mono } from "next/font/google";
import SmoothScroll from "@/components/SmoothScroll";
import Cursor from "@/components/Cursor";
import BriefModal from "@/components/brief/BriefModal";
import JsonLd from "@/components/JsonLd";
import { IS_MIRROR, ORGANIZATION, SITE_NAME, SITE_URL, VERIFICATION, WEBSITE } from "@/lib/seo";
import "./globals.css";

const display = Geologica({
  variable: "--font-display",
  subsets: ["latin", "cyrillic"],
  axes: ["SHRP"],
  display: "swap",
});

const body = Golos_Text({
  variable: "--font-body",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  display: "swap",
});

// Общие метаданные. Страницы задают свои title, description, canonical и превью через pageMeta
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Корпорация | маркетинговое агентство",
  description:
    "Маркетинговое агентство Даниила Карацапова: контекст, таргет, карты, сайты и сквозная аналитика. В digital с 2019 года, 22 кейса с измеримым результатом.",
  applicationName: SITE_NAME,
  authors: [{ name: "Даниил Карацапов" }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  // Копия на GitHub Pages не индексируется: основной сайт один
  robots: IS_MIRROR
    ? { index: false, follow: false }
    : { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  formatDetection: { telephone: false, email: false, address: false },
  // Мета-теги подтверждения Вебмастера и Search Console: только на основном сайте
  verification: IS_MIRROR
    ? undefined
    : { yandex: VERIFICATION.yandex || undefined, google: VERIFICATION.google || undefined },
  openGraph: { type: "website", locale: "ru_RU", siteName: SITE_NAME, images: ["/og/home.jpg"] },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#050505",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body>
        <JsonLd data={[ORGANIZATION, WEBSITE]} />
        <SmoothScroll />
        <Cursor />
        {children}
        <BriefModal />
      </body>
    </html>
  );
}
