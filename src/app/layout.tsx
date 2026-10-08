import type { Metadata, Viewport } from "next";
import { Geologica, Golos_Text, IBM_Plex_Mono } from "next/font/google";
import SmoothScroll from "@/components/SmoothScroll";
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

export const metadata: Metadata = {
  title: "Корпорация | маркетинговое агентство",
  description:
    "Корпорация производит спрос: стратегия, креатив и перформанс-маркетинг для компаний, которым нужен рост выручки.",
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
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
