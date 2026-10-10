import type { MetadataRoute } from "next";
import { IS_MIRROR, SITE_URL } from "@/lib/seo";

export const dynamic = "force-static";

/** robots.txt: основной сайт открыт целиком, копия на GitHub Pages закрыта */
export default function robots(): MetadataRoute.Robots {
  if (IS_MIRROR) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/_next/", "/404/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
