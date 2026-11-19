/**
 * Дела для блока «Досье». Источник: кейсы karatsapov.ru (тексты Даниила).
 * Цифры реальные, ROI сознательно не публикуем. У дела 004 вместо результатов рекламы
 * производственные цифры проекта: отчётный период не закрыт (материалы кейса «Сфера»).
 */
import type { StaticImageData } from "next/image";
import sferaSite from "@/assets/cases/sfera/glavnaya-desktop.webp";
import sferaPhone from "@/assets/cases/sfera/glavnaya-phone.webp";
import { DIAUTO } from "@/content/diauto";
import { IPAPA } from "@/content/ipapa";
import { SARA } from "@/content/sara";
import { KARKAS } from "@/content/karkas";

export type Metric = {
  /** Число для отсчёта; знак и единицы задаются через prefix/suffix */
  value?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  /** Готовая строка без отсчёта, например «34% → 61%» */
  text?: string;
  label: string;
};

export type Case = {
  code: string;
  sector: string;
  client: string;
  services: string;
  title: string;
  task: string;
  solution: string;
  lead: string;
  /** Страница с полным досье, если она есть */
  href?: string;
  /** Снимки работы для карточки: экран сайта и, если есть, телефон поверх */
  cover?: { site: StaticImageData; phone?: StaticImageData; alt: string };
  metrics: Metric[];
};

export const CASES: Case[] = [
  {
    code: KARKAS.code,
    sector: KARKAS.sector,
    client: "«Каркас Комфорт», каркасные дома под ключ, Тверь",
    services: "Сайт · CRM и админка · Яндекс Директ · Авито Ads · Сбер Ads",
    title: "Сайт строительной компании заново: 69 страниц, своя CRM и проверка каждой правки",
    task: "Сайт выглядел как шаблон из нейросети: заглушки вместо домов и цен, мелкий текст, демо-хостинг. Нужно больше заявок, дороже вид и техническое качество.",
    solution: "Дизайн-система «Чертёж», 8 проектов и 10 объектов со 155 фото, карта охвата и квиз, заявки в почту, Telegram, MAX и CRM, реклама в трёх каналах.",
    lead: "Даниил",
    href: "/kejsy/karkas-komfort/",
    cover: KARKAS.cover,
    metrics: [
      { value: 69, label: "страниц на сайте" },
      { value: 155, label: "фото со сдачи объектов" },
      { value: 50, label: "сценариев проверки в браузере" },
    ],
  },
  {
    code: "004",
    sector: "Проектирование",
    client: "Проектная компания «Сфера», Москва, МО и Тверская область",
    services: "Сайт · Яндекс Директ · Аналитика · ИИ-инструменты",
    title: "Собрали проектной компании маркетинг целиком: от сайта до ИИ-агента по Директу",
    task: "Человек ищет не «купить», а «как получить разрешение». Вопросов много, сделка долгая, а цифры рекламы, Метрики и заявок не сходились.",
    solution: "Сайт под намерения, Директ, связанный с аналитикой в одну таблицу, ИИ-агент с правилами владельца, контент и боты.",
    lead: "Даниил",
    href: "/kejsy/sfera/",
    cover: { site: sferaSite, phone: sferaPhone, alt: "Сайт «Сферы» на компьютере и на телефоне" },
    metrics: [
      { value: 121, label: "страница сайта под спрос" },
      { value: 251, label: "вопрос в базе ИИ-ассистента" },
      { value: 8, label: "разделов своей аналитики" },
    ],
  },
  {
    code: DIAUTO.code,
    sector: DIAUTO.sector,
    client: "ДиАвто69, импорт авто из Кореи, Китая и Японии, Тверь",
    services: "Сайт · Telegram-бот · CRM · Яндекс Директ · Аналитика",
    title: "Превратили Telegram-канал импортёра авто в систему продаж",
    task: "Каталог заносили на сайт руками, заявки терялись между мессенджерами, рекламу было нечем измерить.",
    solution: "Каталог на автопилоте из постов канала, бот с мини-приложением, своя CRM, фиды на четыре площадки и сквозная аналитика.",
    lead: "Даниил",
    href: "/kejsy/diauto69/",
    cover: DIAUTO.cover,
    metrics: [
      { value: 284, label: "авто в каталоге без ручного ввода" },
      { value: 5547, label: "визитов за 90 дней" },
      { value: 4, label: "рекламные площадки на одном фиде" },
    ],
  },
  {
    code: "010",
    sector: "Ритейл техники",
    client: "айпапа.рф, магазин техники Apple и Android, Тверь",
    services: "Telegram-бот · Мини-приложение · Яндекс Директ · Telegram Ads · Яндекс Бизнес",
    title: "Обошли маркетплейсы трейд-ином и двумя гарантиями",
    task: "Технику Apple сравнивают по цене за десять секунд, а цены федеральных маркетплейсов не перебить.",
    solution: "Кампании по моделям и их марже, в объявлениях трейд-ин и две гарантии, карточка-витрина. Бот с подпиской на цену и магазин внутри Telegram с трейд-ином.",
    lead: "Даниил",
    href: "/kejsy/ipapa/",
    cover: IPAPA.cover,
    metrics: [
      { value: 53, prefix: "+", suffix: "%", label: "продаж" },
      { value: 45, prefix: "−", suffix: "%", label: "стоимость заявки" },
      { value: 33, suffix: "%", label: "лидов с карточки в Яндекс Бизнесе" },
    ],
  },
  {
    code: SARA.code,
    sector: SARA.sector,
    client: "Сара, голосовой ассистент маркетолога",
    services: "Telegram-бот · MAX-бот · Мини-приложение · YandexGPT · SpeechKit",
    title: "Задачи, встречи и клиенты заводятся одной фразой голосом",
    task: "Десяток клиентов, бюджеты, отчёты и созвоны. Таск-менеджер просит заполнять поля, и на бегу задача не записывается вовсе.",
    solution: "Голосовой ассистент в Telegram и MAX на одной базе: сам понимает тип записи, срок и клиента, мини-приложение с задачами, календарём и клиентами.",
    lead: "Даниил",
    href: "/kejsy/sara/",
    cover: SARA.cover,
    metrics: [
      { text: "96/96", label: "голосовых команд разбираются без ИИ" },
      { value: 139, label: "модульных тестов" },
      { value: 2, label: "мессенджера, одна база" },
    ],
  },
];

/** Номер следующего дела: на брифе клиент видит, что его дело будет следующим */
export const NEXT_CASE = String(Math.max(...CASES.map((c) => Number(c.code))) + 1).padStart(3, "0");

const caseNum = new Intl.NumberFormat("ru-RU");

/** Метрика дела строкой: «+53%», «5 547», «12→77%» */
export const formatMetric = (m: Metric) =>
  m.text ?? `${m.prefix ?? ""}${m.decimals ? (m.value ?? 0).toFixed(m.decimals).replace(".", ",") : caseNum.format(m.value ?? 0)}${m.suffix ?? ""}`;
