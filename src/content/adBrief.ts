/**
 * Бриф на размещение рекламы: страница /brif/ (закрыта от поисковиков, ссылку отправляют клиенту).
 * Вопросы — из брифа агентства в Word. Ответы уходят в кабинет, раздел «Брифы».
 */

export type BriefField = {
  id: string;
  label: string;
  /** Подсказка под полем */
  hint?: string;
  kind?: "text" | "area" | "phone" | "email" | "choice" | "multi";
  options?: string[];
  /** Для выбора «Да»: поле с уточнением появляется рядом */
  detail?: { when: string; label: string };
  required?: boolean;
  /** Поле на всю ширину строки */
  wide?: boolean;
  autoComplete?: string;
};

export type BriefSection = { id: string; title: string; note?: string; fields: BriefField[] };

const YES_NO = ["Да", "Нет"];

export const AD_BRIEF: BriefSection[] = [
  {
    id: "company",
    title: "Информация о компании",
    fields: [
      { id: "company", label: "Название компании", required: true, autoComplete: "organization" },
      { id: "age", label: "Как долго существует ваш бизнес?", hint: "Например: 3 года" },
      { id: "contactName", label: "Контактное лицо", required: true, autoComplete: "name" },
      { id: "phone", label: "Телефон", kind: "phone", autoComplete: "tel" },
      { id: "email", label: "E-mail", kind: "email", autoComplete: "email" },
      { id: "site", label: "Сайт", hint: "Адрес, если сайт уже есть", autoComplete: "url" },
      { id: "needSite", label: "Требуется создание сайта?", kind: "choice", options: YES_NO },
      { id: "socials", label: "Ссылки на соцсети", hint: "VK, Telegram, Instagram" },
    ],
  },
  {
    id: "business",
    title: "Компания и услуги",
    fields: [
      { id: "activity", label: "Вид деятельности", kind: "choice", options: ["Продажи", "Услуги", "И то и другое"] },
      { id: "hours", label: "Время работы и приёма заказов", hint: "Например: пн–пт с 9 до 19" },
      { id: "features", label: "Особенности ваших услуг или товаров", kind: "area" },
      { id: "audience", label: "Ваша целевая аудитория", hint: "Кто покупает: пол, возраст, доход, интересы, город", kind: "area" },
      { id: "usp", label: "Чем вы лучше конкурентов", hint: "Ваше УТП: цена, сроки, гарантия, опыт, сервис", kind: "area" },
      { id: "weak", label: "Чем вы хуже конкурентов", hint: "Где проигрываете: цена, сроки, ассортимент, отзывы", kind: "area" },
      { id: "doubts", label: "Вопросы и сомнения клиентов перед покупкой", hint: "Дорого, долго, нет доверия, сравнивают с другими", kind: "area" },
      { id: "seasonality", label: "Есть ли у бизнеса сезонность?", kind: "choice", options: YES_NO, detail: { when: "Да", label: "Какой период — пик и спад" } },
      { id: "competitors", label: "Конкуренты и ссылки на их сайты", kind: "area" },
      { id: "leaders", label: "Лидеры вашей ниши: на кого равняетесь", hint: "Ссылки на сайты компаний, которые вам нравятся", kind: "area" },
    ],
  },
  {
    id: "campaign",
    title: "Рекламная кампания",
    fields: [
      { id: "direction", label: "Какие товары или услуги рекламируем", hint: "Если направлений несколько, перечислите все", kind: "area" },
      { id: "geo", label: "География рекламы", hint: "Город, область, вся Россия", kind: "area" },
      {
        id: "platforms",
        label: "Рекламные площадки",
        hint: "Можно выбрать несколько",
        kind: "multi",
        options: ["Яндекс Директ", "VK Реклама", "Telegram Ads", "Авито", "Яндекс Карты и 2ГИС", "Посоветуйте нам"],
        detail: { when: "", label: "Другие площадки" },
        wide: true,
      },
    ],
  },
  {
    id: "extra",
    title: "Дополнительная информация",
    note: "Для оценки текущей рекламы откройте гостевой доступ к Яндекс Метрике для d.karatsapov@yandex.ru",
    fields: [
      { id: "channels", label: "Какие рекламные каналы работают сейчас", kind: "area" },
      { id: "access", label: "Дадите доступ на просмотр к рекламным кабинетам?", kind: "choice", options: ["Да", "Нет", "Кабинетов нет"] },
      { id: "check", label: "Средний чек сделки" },
      { id: "cpl", label: "Приемлемая цена заявки" },
      { id: "volume", label: "Сколько заявок в месяц ждёте" },
      { id: "goal", label: "Цель рекламной кампании", hint: "Заявки, звонки, продажи в интернет-магазине, узнаваемость", kind: "area" },
    ],
  },
  {
    id: "money",
    title: "Бюджет и сроки",
    fields: [
      { id: "start", label: "Дата начала кампании" },
      { id: "duration", label: "Длительность кампании" },
      { id: "budget", label: "Бюджет в месяц" },
      { id: "split", label: "Как распределить бюджет по направлениям", kind: "area" },
    ],
  },
];
