import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-static";

/** Карта сайта: все публичные страницы. Новую страницу добавляйте сюда же */
const PAGES: { path: string; priority: number; changeFrequency: "weekly" | "monthly" }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/uslugi/kontekstnaya-reklama/", priority: 0.9, changeFrequency: "monthly" },
  { path: "/uslugi/targetirovannaya-reklama/", priority: 0.9, changeFrequency: "monthly" },
  { path: "/uslugi/karty-i-geoservisy/", priority: 0.9, changeFrequency: "monthly" },
  { path: "/kejsy/sfera/", priority: 0.7, changeFrequency: "monthly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PAGES.map((p) => ({
    url: `${SITE_URL}${p.path}`,
    lastModified,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
