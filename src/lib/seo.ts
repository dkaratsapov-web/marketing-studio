import type { Metadata } from "next";
import { PHONES, TELEGRAM } from "@/content/contacts";

/**
 * Основной адрес сайта. Копия на GitHub Pages собирается с PAGES_BASE_PATH: она закрыта
 * от индексации, а canonical у неё ведёт на основной домен, чтобы поиск не видел дублей.
 */
export const SITE_URL = (process.env.SITE_URL ?? "https://marketing-studio.pro").replace(/\/$/, "");
export const IS_MIRROR = Boolean(process.env.PAGES_BASE_PATH);
export const SITE_NAME = "Корпорация";

const abs = (path: string) => `${SITE_URL}${path}`;

type PageMeta = {
  title: string;
  description: string;
  /** Путь страницы со слешем на конце, как в trailingSlash */
  path: string;
  /** Картинка для превью в мессенджерах из public/og */
  og: string;
  type?: "website" | "article";
};

/** Метаданные страницы: title, description, canonical и превью для соцсетей и мессенджеров */
export function pageMeta({ title, description, path, og, type = "website" }: PageMeta): Metadata {
  const image = { url: `/og/${og}.jpg`, width: 1200, height: 630, alt: title };
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type,
      locale: "ru_RU",
      siteName: SITE_NAME,
      url: path,
      title,
      description,
      images: [image],
    },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

/** Агентство как организация: одна сущность, на которую ссылаются услуги и кейсы */
export const ORG_ID = `${SITE_URL}/#org`;

export const ORGANIZATION = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": ORG_ID,
  name: SITE_NAME,
  alternateName: "Маркетинговое агентство «Корпорация»",
  url: abs("/"),
  logo: abs("/apple-icon.png"),
  image: abs("/og/home.jpg"),
  description:
    "Маркетинговое агентство Даниила Карацапова: контекстная и таргетированная реклама, карты и геосервисы, сайты и сквозная аналитика.",
  telephone: PHONES.map((p) => p.href.replace("tel:", "")),
  founder: { "@type": "Person", name: "Даниил Карацапов" },
  foundingDate: "2019",
  areaServed: { "@type": "Country", name: "Россия" },
  sameAs: [TELEGRAM.href],
  contactPoint: PHONES.map((p) => ({
    "@type": "ContactPoint",
    telephone: p.href.replace("tel:", ""),
    contactType: "sales",
    areaServed: "RU",
    availableLanguage: "Russian",
  })),
};

export const WEBSITE = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#site`,
  name: SITE_NAME,
  url: abs("/"),
  inLanguage: "ru-RU",
  publisher: { "@id": ORG_ID },
};

/** Хлебные крошки: те же, что видны в шапке первого экрана */
export function breadcrumbs(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: abs(it.path),
    })),
  };
}

/** Услуга отдела с ценой из прайса: «от N ₽ в месяц» */
export function service({
  name,
  description,
  path,
  price,
  type,
}: {
  name: string;
  description: string;
  path: string;
  price: number;
  type: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    serviceType: type,
    description,
    url: abs(path),
    provider: { "@id": ORG_ID },
    areaServed: { "@type": "Country", name: "Россия" },
    offers: {
      "@type": "Offer",
      url: abs(path),
      priceCurrency: "RUB",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price,
        priceCurrency: "RUB",
        unitText: "месяц",
        description: `от ${price.toLocaleString("ru-RU")} ₽ в месяц, рекламный бюджет отдельно`,
      },
    },
  };
}

export function faqPage(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export { abs as absoluteUrl };
