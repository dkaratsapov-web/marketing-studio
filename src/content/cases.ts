/**
 * Дела для блока «Досье».
 * ВНИМАНИЕ: сейчас здесь примеры с условными цифрами (example: true).
 * Замените их реальными кейсами с сайта клиента и уберите флаг example.
 */
export type Metric = {
  /** Число для отсчёта; знак и единицы задаются через prefix/suffix */
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  label: string;
};

export type Case = {
  code: string;
  sector: string;
  client: string;
  title: string;
  task: string;
  solution: string;
  metrics: Metric[];
  example?: boolean;
};

export const CASES: Case[] = [
  {
    code: "001",
    sector: "Девелопмент",
    client: "Девелопер жилья бизнес-класса",
    title: "Снизили стоимость заявки и загрузили отдел продаж на полгода вперёд",
    task: "Заявки дорожали, отдел продаж простаивал между очередями.",
    solution: "Новое позиционирование очереди, сквозная аналитика, перезапуск performance-кампаний.",
    metrics: [
      { value: 38, prefix: "−", suffix: "%", label: "стоимость заявки" },
      { value: 2.1, decimals: 1, prefix: "×", label: "заявок за квартал" },
      { value: 4, suffix: " мес", label: "до результата" },
    ],
    example: true,
  },
  {
    code: "002",
    sector: "Медицина",
    client: "Сеть частных клиник",
    title: "Вывели сеть клиник в лидеры локального поиска",
    task: "Пациенты находили конкурентов раньше, чем клинику.",
    solution: "Локальное SEO по каждой клинике, работа с отзывами, контент от врачей.",
    metrics: [
      { value: 64, prefix: "+", suffix: "%", label: "онлайн-записей" },
      { value: 27, prefix: "−", suffix: "%", label: "стоимость записи" },
      { value: 12, label: "клиник в топ-3" },
    ],
    example: true,
  },
  {
    code: "003",
    sector: "E-commerce",
    client: "Интернет-магазин премиальной косметики",
    title: "Перезапустили бренд и рекламу, не потеряв маржу",
    task: "Рост держался на скидках, маржа падала каждый квартал.",
    solution: "Ребрендинг, креативная платформа без скидок, ретеншн-коммуникации.",
    metrics: [
      { value: 52, prefix: "+", suffix: "%", label: "выручка за год" },
      { value: 310, suffix: "%", label: "ROMI" },
      { value: 19, prefix: "−", suffix: "%", label: "стоимость клиента" },
    ],
    example: true,
  },
  {
    code: "004",
    sector: "B2B SaaS",
    client: "Платформа для логистических компаний",
    title: "Построили поток квалифицированных лидов для отдела продаж",
    task: "Лиды приходили, но не доходили до сделки.",
    solution: "ABM-кампании, вебинары с отраслевыми экспертами, скоринг лидов вместе с продажами.",
    metrics: [
      { value: 3, prefix: "×", label: "квалифицированных лидов" },
      { value: 41, prefix: "−", suffix: "%", label: "стоимость лида" },
      { value: 9, suffix: " мес", label: "контракт продлён" },
    ],
    example: true,
  },
];
