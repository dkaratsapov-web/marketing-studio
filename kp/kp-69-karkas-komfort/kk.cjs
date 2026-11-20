// КП № 69 Корпорации для «КаркасКомфорта»: продвижение на новых площадках.
// Шрифты и знак — с сайта (сборка out/). Запуск из корня репозитория:
// npm run build && (cd out && python3 -m http.server 8088 &) && node kp/kp-69-karkas-komfort/kk.cjs <папка для PDF>
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { AD, ADS_CSS } = require('./ads.cjs');

const SITE_OUT = path.resolve(__dirname, '../../out');
const MARK = JSON.parse(fs.readFileSync(path.join(__dirname, 'mark.json'), 'utf8'));
// Файл стилей с шрифтами меняет имя при каждой сборке: ищем тот, где объявлен Geologica
const chunks = path.join(SITE_OUT, '_next/static/chunks');
const css = fs.readdirSync(chunks).filter((f) => f.endsWith('.css')).map((f) => fs.readFileSync(path.join(chunks, f), 'utf8')).find((c) => c.includes('font-family:Geologica')) ?? '';
const FONTS = (css.match(/@font-face\{[^}]*\}/g) ?? []).map((r) => r.replace(/url\(\.\.\/media\//g, 'url(/_next/static/media/')).join('\n');

const META = { number: '69', date: '9 ноября 2026', client: '«КаркасКомфорт»' };
const rub = (n) => `${n.toLocaleString('ru-RU').replace(/ /g, ' ')} ₽`;

const PLATFORMS = [
  {
    name: 'Авито Реклама',
    stats: [["72 млн", "пользователей в месяц", "данные Авито"], ["51,4%", "россиян заходят на Авито ежемесячно", "Mediascope, апрель 2026"], ["10 000+", "вариантов таргетинга", "Авито Реклама"]],
    places: ["Выдача поиска", "Карточки объявлений", "Сайт и приложение Авито"],
    unique: "Интересы по реальному поведению на Авито: показываем тем, кто в последние дни смотрел дома, участки и стройматериалы. Это не анкета, а то, что человек ищет прямо сейчас",
    key: 'avito',
    targets: ["Гео: город и область, в крупных городах — район и метро", "Интересы по поведению на Авито: дома и дачи, земельные участки, стройматериалы, ремонт", "Пол и возраст: тестируем 28–60 лет, оставляем тех, кто даёт заявки", "Объявление стоит рядом с карточками конкурентов — человек сравнивает сразу"],
    settings: ["Цель: переходы на сайт или в профиль «КаркасКомфорта» на Авито", "Формат: фото дома, цена «от», короткий текст и кнопка", "Дневной лимит бюджета, ставку держит автоуправление Авито", "Профиль на Авито с проектами — чтобы реклама вела на витрину, а не в пустоту"],
    where: 'В выдаче и карточках Авито\u00a0— рядом с объявлениями о домах, участках и стройке',
    why: 'Человек уже выбирает дом или участок. Тёплый спрос, а конкурентов в рекламном кабинете пока мало',
    do: 'Объявления на тех, кто смотрит дома, участки и стройматериалы в вашем регионе',
  },
  {
    name: 'VK Реклама',
    stats: [["93,4 млн", "человек в месяц во ВКонтакте", "VK, I квартал 2026"], ["90%", "интернет-аудитории России охватывает ВКонтакте за месяц", "VK, I квартал 2026"], ["82,8 млн", "зрителей VK Видео в месяц", "Mediascope, январь 2026"]],
    places: ["Лента ВКонтакте", "Клипы и истории", "VK Видео", "Одноклассники", "Сайты и приложения партнёров VK"],
    unique: "Ключевые фразы: реклама тем, кто недавно искал «каркасный дом» или «участок ИЖС». И лид-форма — телефон оставляют, не уходя из ленты",
    key: 'vk',
    targets: ["Гео: город, область или радиус от точки", "Интересы: недвижимость, загородная жизнь, строительство, ипотека", "Ключевые фразы: что люди искали — «каркасный дом», «дом под ключ», «участок ИЖС»", "Подписчики сообществ: стройка, коттеджные посёлки, группы конкурентов", "Догон посетителей сайта по пикселю VK и похожие на ваших клиентов"],
    settings: ["Цель: заявка в лид-форме — телефон без перехода на сайт", "Форматы: запись с фото, карусель проектов, видео со стройки", "Оптимизация на заявки, стратегия минимальной цены", "Заявки из лид-формы сразу уходят в мессенджер и CRM"],
    where: 'Лента ВКонтакте, Одноклассники и сайты партнёров VK',
    why: 'Дом выбирают месяцами. Здесь проще всего показывать проекты и видео со строек, пока человек решается',
    do: 'Лид-формы без перехода на сайт, догон посетителей сайта, аудитории, похожие на ваших клиентов',
  },
  {
    name: 'SberAds',
    stats: [["108 млн", "человек в месяц в экосистеме Сбера", "данные Сбера"], ["от 15 000 ₽", "минимальное пополнение без НДС", "обзоры SberAds, 2026"], ["1 цель", "— и алгоритм сам подбирает площадки под неё", "SberAds"]],
    places: ["Сервисы Сбера: Okko, Звук, Мегамаркет и другие", "Партнёрские сайты и приложения"],
    unique: "Аудитории на данных экосистемы Сбера: интерес к недвижимости, ипотеке и загородным покупкам виден по поведению в сервисах, а не по анкетам",
    key: 'sber',
    targets: ["Аудитории на данных экосистемы Сбера: интерес к недвижимости, загородным домам, ипотеке", "Гео: город и область", "Пол и возраст", "Площадки подбирает алгоритм под цель кампании"],
    settings: ["Цель: переходы на сайт и заявки", "Оплата за клики, пополнение от 15 000 ₽ без НДС, только безнал", "Формат: фото, заголовок, текст и кнопка", "Главные рычаги — аудитория и креатив, поэтому тестируем 3–4 варианта объявления"],
    where: 'Сервисы экосистемы Сбера и партнёрские площадки',
    why: 'Дом чаще всего берут в ипотеку, а Сбер — крупнейший ипотечный банк страны. Реклама стоит рядом с сервисами, которыми покупатель пользуется каждый день',
    do: 'Кампания на покупателей загородного жилья, алгоритм подбирает площадки сам',
  },
  {
    name: 'MAX через Яндекс Директ',
    stats: [["86,3 млн", "человек в месяц — больше, чем у Telegram", "Mediascope, июнь 2026"], ["80 млн+", "заходят в MAX каждый день", "данные MAX, май 2026"], ["45–70%", "подписчиков видят пост в канале — в Telegram около 5%", "РБК, 2026"]],
    places: ["Каналы MAX из Рекламной сети Яндекса", "Каналы от 1 000 подписчиков через VK Рекламу — с 5 октября 2026"],
    unique: "Персональный таргетинг Директа (с октября 2026): объявление в канале подбирается под конкретного человека по его интересам в Яндексе, а не под тему канала",
    key: 'max',
    targets: ["Каналы MAX из Рекламной сети Яндекса, подборка по тематике", "Персональный таргетинг (с октября 2026): объявление подбирается под человека, а не под канал", "Гео, пол, возраст и интересы Яндекса: недвижимость, загородные дома, ипотека", "Сегменты Метрики: смотрели проекты на сайте, но не оставили заявку"],
    settings: ["Формат: рекламный пост в канале — фото, текст и кнопка", "Стратегия Директа на конверсии по целям Метрики сайта", "Заявки из MAX и с сайта — в одном отчёте", "Формат в бете: начинаем с части бюджета, растим по результату"],
    where: 'Рекламные посты в каналах мессенджера MAX, запускаются из Директа',
    why: 'Площадка открылась в 2026 году: аукцион ещё не перегрет, клик дешевле, чем в привычных каналах',
    do: 'Запуск в Директе с теми же целями Метрики, что и на сайте, — заявки считаются вместе',
  },
  {
    name: 'Telegram Ads',
    stats: [["75,7 млн", "человек в месяц в России", "Mediascope, июнь 2026"], ["250 €", "минимальный вход в официальный Telegram Ads", "с марта 2026, eLama"], ["160 знаков", "длина рекламного сообщения", "Telegram Ads"]],
    places: ["Публичные каналы от 1 000 подписчиков", "Каналы о стройке, недвижимости, ипотеке", "Местные каналы вашего региона"],
    unique: "Выбор конкретных каналов по названию: показываемся только читателям местных каналов и каналов про стройку и ипотеку",
    key: 'telegram',
    targets: ["Каналы подбираем вручную: стройка, загородная недвижимость, ипотека, дачи", "Местные каналы вашего города и области", "Тематики каналов: недвижимость, дом и сад, финансы", "Запуск через VK Рекламу или Яндекс Директ: порог входа ниже, чем напрямую"],
    settings: ["Формат: рекламное сообщение в канале — текст до 160 знаков, фото, кнопка", "Ведём на каталог проектов на сайте или в бот-консультант", "Контроль частоты: одно объявление не надоедает читателю", "UTM-метки и цели Метрики — видно, какой канал дал заявку", "Аудитория Telegram в России в 2026 году снижается — следим за ценой заявки каждую неделю"],
    where: 'Посты в каналах про стройку, загородную жизнь, ипотеку и недвижимость',
    why: 'Читатели этих каналов уже думают о доме, а не листают ленту от скуки',
    do: 'Подбор каналов по теме и региону, объявления со ссылкой на каталог проектов',
  },
];

const STEPS = [
  ['1–3 дня', 'Разбор конкурентов на каждой площадке, аудитории, тексты и креативы с вашими проектами и объектами'],
  ['4–6 дней', 'Кабинеты, цели Метрики, лид-формы. Заявки сразу в мессенджер и CRM'],
  ['2 недели', 'Тест: все площадки работают параллельно, считаем цену заявки по каждой'],
  ['Дальше', 'Бюджет туда, где заявка дешевле. Что не окупается — отключаем'],
];

// Рекомендуемый рекламный бюджет на месяц теста и стоимость ведения по площадкам. Порядок — как в слайдах
const FEE = { 'Авито Реклама': 25_000, 'VK Реклама': 15_000, 'SberAds': 20_000, 'MAX через Яндекс Директ': 10_000, 'Telegram Ads': 20_000 };
const FEE_MIN = Math.min(...Object.values(FEE));
const BUDGET = { 'Авито Реклама': 40_000, 'VK Реклама': 50_000, 'SberAds': 30_000, 'MAX через Яндекс Директ': 30_000, 'Telegram Ads': 40_000 };
// площадки, где бюджет указан как нижняя граница («от»)
const FROM = new Set(Object.keys(BUDGET));
const SHORT = { 'MAX через Яндекс Директ': 'MAX (Яндекс Директ)' };
const BUDGET_TOTAL = Object.values(BUDGET).reduce((a, x) => a + x, 0);

const markSvg = (cls = 'mark') =>
  `<svg class="${cls}" viewBox="0 0 ${MARK.w} ${MARK.h}" aria-hidden="true"><path d="${MARK.large.ink}" fill="currentColor"/><path d="${MARK.large.lime}" fill="var(--lime)"/></svg>`;

const brand = `<div class="brand">${markSvg()}<span>Корпорация</span></div>`;
const PAGES = 2 + PLATFORMS.length;
const foot = (n) => `<footer class="foot"><span>КП № ${META.number} · ${META.client}</span><span>marketing-studio.pro</span><span>${n} / ${PAGES}</span></footer>`;

const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>КП № ${META.number}</title><style>
${FONTS}
@page { size: 297mm 210mm; margin: 0; }
:root { --black:#050505; --ink:#0d0d0d; --white:#fff; --lime:#c4f542; --pink:#ff4d9d; --pink-d:#d1006a; --muted:#8a8a8a; --line:rgba(255,255,255,.14); --line-l:rgba(5,5,5,.12);
  --ff-d:Geologica,sans-serif; --ff-b:"Golos Text",sans-serif; --ff-m:"IBM Plex Mono",monospace; }
* { box-sizing:border-box; margin:0; padding:0; }
html { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
body { font-family:var(--ff-b); background:#222; }
.page { width:297mm; height:210mm; position:relative; overflow:hidden; padding:14mm 16mm 12mm; display:flex; flex-direction:column; page-break-after:always; }
.dark { background:var(--black); color:var(--white); }
.light { background:var(--white); color:var(--black); }
.brand { display:flex; align-items:center; gap:3mm; font-family:var(--ff-d); font-weight:800; font-size:12pt; letter-spacing:.14em; text-transform:uppercase; }
.mark { width:7mm; height:7mm; }
.label { font-family:var(--ff-m); font-size:8.5pt; letter-spacing:.12em; text-transform:uppercase; color:var(--muted); }
.light .label { color:#6b6b6b; }
.foot { margin-top:auto; display:flex; justify-content:space-between; font-family:var(--ff-m); font-size:7.5pt; letter-spacing:.08em; color:var(--muted); padding-top:4mm; }
h1 { font-family:var(--ff-d); font-weight:800; font-size:50pt; line-height:.94; letter-spacing:-.045em; }
h2 { font-family:var(--ff-d); font-weight:800; font-size:27pt; line-height:1; letter-spacing:-.035em; }
.dot { color:var(--lime); }
.light .dot { color:var(--pink-d); }

/* Обложка */
.cover .top { display:flex; justify-content:space-between; align-items:center; }
.cover .hero { margin-top:auto; display:grid; gap:6mm; }
.cover h1 { max-width:205mm; }
.cover .sub { font-size:14pt; line-height:1.4; color:rgba(255,255,255,.72); max-width:190mm; }
.chips { display:flex; flex-wrap:wrap; gap:2.5mm; }
.chip { font-family:var(--ff-d); font-weight:600; font-size:10.5pt; padding:2mm 3.8mm; border:1px solid var(--line); border-radius:999px; }
.chip.on { background:var(--lime); color:var(--black); border-color:var(--lime); }
.usp { display:grid; grid-template-columns:repeat(3,1fr); gap:8mm; margin-top:10mm; padding-top:6mm; border-top:1px solid var(--line); }
.usp b { display:block; font-family:var(--ff-d); font-weight:800; font-size:24pt; letter-spacing:-.03em; line-height:1; margin-bottom:2mm; }
.usp b em { font-style:normal; color:var(--lime); }
.usp span { font-size:10pt; line-height:1.35; color:rgba(255,255,255,.66); }
.glow { position:absolute; right:-40mm; top:-30mm; width:170mm; height:170mm; border-radius:50%; background:radial-gradient(circle, rgba(196,245,66,.16), transparent 62%); }
.bigmark { position:absolute; right:16mm; top:36mm; width:64mm; height:64mm; color:rgba(255,255,255,.07); }

/* Слайд площадки: слева таргетинги и настройки, справа макет объявления */
.pf { display:grid; grid-template-columns:1fr 84mm; gap:12mm; flex:1; margin-top:5mm; min-height:0; }
.pf .l { display:flex; flex-direction:column; gap:4mm; }
.stats { display:grid; grid-template-columns:repeat(3,1fr); gap:5mm; }
.stat { border-top:2.5px solid var(--black); padding-top:2.5mm; }
.stat b { display:block; font-family:var(--ff-d); font-weight:800; font-size:21pt; letter-spacing:-.035em; line-height:1; }
.stat span { display:block; font-size:9pt; line-height:1.3; margin-top:1.5mm; color:#222; }
.stat i { display:block; font-style:normal; font-family:var(--ff-m); font-size:6.5pt; letter-spacing:.05em; color:#8a8a8a; margin-top:1mm; }
.places { display:flex; flex-wrap:wrap; gap:1.8mm; align-items:center; }
.places span.k { margin:0 1mm 0 0; border:0; padding:0; font-size:7.5pt; }
.places span { font-size:8.8pt; padding:1.2mm 2.8mm; border:1px solid rgba(5,5,5,.22); border-radius:999px; }
.duo { display:grid; grid-template-columns:1fr 1fr; gap:4mm; }
.uniq { background:var(--black); color:var(--white); padding:3.5mm 4mm; font-size:9.6pt; line-height:1.4; }
.uniq .k { color:var(--lime); }
.pf .where { font-size:11pt; line-height:1.4; color:#333; max-width:150mm; }
.pf .why { background:var(--lime); padding:3.5mm 4mm; font-size:9.6pt; line-height:1.4; }
.pf .why .k { color:#3b4a0f; }
.k { font-family:var(--ff-m); font-size:7.5pt; letter-spacing:.1em; text-transform:uppercase; color:#777; margin-bottom:1.5mm; }
.cols { display:grid; grid-template-columns:1fr 1fr; gap:8mm; }
.cols h3 { font-family:var(--ff-d); font-weight:700; font-size:12pt; letter-spacing:-.02em; padding-top:0; margin-bottom:2mm; }
.cols ul { list-style:none; display:grid; gap:1.6mm; }
.cols li { font-size:9pt; line-height:1.34; padding-left:4.5mm; position:relative; }
.cols li::before { content:""; position:absolute; left:0; top:.55em; width:2mm; height:2mm; background:var(--black); }
.cols .set li::before { background:var(--pink-d); border-radius:50%; }
.pf .r { display:flex; flex-direction:column; align-items:center; justify-content:flex-start; gap:3mm; }
.pf .r .phone { transform:scale(.93); transform-origin:top center; margin-bottom:-41px; }
.pf .cap { font-family:var(--ff-m); font-size:7pt; letter-spacing:.06em; color:#888; text-align:center; max-width:76mm; line-height:1.4; }
.step-n { font-family:var(--ff-m); font-size:8.5pt; letter-spacing:.12em; color:#6b6b6b; }
.top2 { display:flex; justify-content:space-between; align-items:center; }
${ADS_CSS}

/* План и цены */
.plan { display:grid; grid-template-columns:1.45fr .8fr; gap:12mm; flex:1; margin-top:7mm; align-items:start; }
.side { padding-top:27mm; }
.side .terms { margin-top:0; font-size:10pt; gap:3.5mm; }
.steps { display:grid; gap:0; align-content:start; }
.step { display:grid; grid-template-columns:28mm 1fr; gap:5mm; padding:4.2mm 0; border-top:1px solid var(--line); }
.step b { font-family:var(--ff-d); font-weight:700; font-size:13pt; color:var(--lime); letter-spacing:-.01em; }
.step span { font-size:10.5pt; line-height:1.4; color:rgba(255,255,255,.84); }
.price { display:grid; gap:0; align-content:start; }
.pr { display:grid; grid-template-columns:1fr auto; align-items:baseline; gap:4mm; padding:4mm 0; border-top:1px solid var(--line); }
.pr .n { font-size:11pt; }
.pr .v { font-family:var(--ff-d); font-weight:800; font-size:20pt; letter-spacing:-.03em; text-align:right; }
.pr .s { grid-column:1 / -1; font-family:var(--ff-m); font-size:7.5pt; letter-spacing:.06em; color:var(--muted); margin-top:-2mm; }
.pr.best { background:var(--lime); color:var(--black); padding:4mm 4mm; border-top:0; }
.pr.best .s { color:#3b4a0f; }
.bt { width:100%; border-collapse:collapse; margin-top:5mm; font-size:11pt; }
.bt th { font-family:var(--ff-m); font-weight:400; font-size:7.5pt; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); text-align:right; padding:0 0 2.5mm; }
.bt th:first-child, .bt td:first-child { text-align:left; }
.bt td { padding:3.4mm 0; border-top:1px solid var(--line); text-align:right; font-variant-numeric:tabular-nums; }
.bt td.v { font-family:var(--ff-d); font-weight:700; font-size:13.5pt; letter-spacing:-.02em; }
.bt tr.tot td { background:var(--lime); color:var(--black); border-top:0; padding:4mm 0; }
.bt tr.tot td:first-child { padding-left:3.5mm; font-weight:600; }
.bt tr.tot td:last-child { padding-right:3.5mm; }
.disc { margin-top:2.5mm; font-family:var(--ff-m); font-size:8pt; letter-spacing:.03em; color:var(--lime); }
.terms { margin-top:4mm; display:grid; gap:2mm; font-size:9.2pt; line-height:1.4; color:rgba(255,255,255,.7); }
.terms b { color:var(--white); font-weight:600; }
.cta { margin-top:6mm; display:flex; justify-content:space-between; align-items:flex-end; gap:8mm; padding-top:5mm; border-top:1px solid var(--line); }
.cta p { font-family:var(--ff-d); font-weight:700; font-size:15pt; letter-spacing:-.02em; max-width:120mm; line-height:1.15; }
.contacts { text-align:right; font-family:var(--ff-m); font-size:10pt; line-height:1.6; }
</style></head><body>

<section class="page dark cover">
  <div class="glow"></div>${markSvg('bigmark')}
  <div class="top">${brand}<span class="label">Коммерческое предложение № ${META.number} от ${META.date}</span></div>
  <div class="hero">
    <p class="label">Для ${META.client}</p>
    <h1>Заявки на каркасные дома с пяти новых площадок<span class="dot">.</span></h1>
    <p class="sub">Там, где ваши покупатели проводят время каждый день, а строителей среди рекламодателей пока мало: Авито, ВКонтакте, Сбер, MAX и Telegram.</p>
    <div class="chips">${PLATFORMS.map((p, i) => `<span class="chip${i === 0 ? ' on' : ''}">${p.name}</span>`).join('')}</div>
  </div>
  <div class="usp">
    <div><b><em>5</em> площадок</b><span>ведёт одна команда: тексты, креативы и настройки согласованы между собой</span></div>
    <div><b>2 недели</b><span>тест, после которого видно цену заявки на каждой площадке</span></div>
    <div><b>Каждую неделю</b><span>отчёт: сколько заявок и почём с каждой площадки</span></div>
  </div>
  ${foot(1)}
</section>

${PLATFORMS.map(
  (p, i) => `<section class="page light">
  <div class="top2">${brand}<span class="step-n">ПЛОЩАДКА ${i + 1} ИЗ ${PLATFORMS.length}</span></div>
  <div class="pf">
    <div class="l">
      <h2>${p.name}<span class="dot">.</span></h2>
      <div class="stats">${p.stats.map(([n, l, src]) => `<div class="stat"><b>${n}</b><span>${l}</span><i>${src}</i></div>`).join('')}</div>
      <div class="places"><span class="k">Места показа</span>${p.places.map((x) => `<span>${x}</span>`).join('')}</div>
      <div class="duo"><div class="why"><p class="k">Почему для каркасных домов</p>${p.why}</div><div class="uniq"><p class="k">Только здесь</p>${p.unique}</div></div>
      <div class="cols">
        <div><h3>Таргетинги</h3><ul>${p.targets.map((t) => `<li>${t}</li>`).join('')}</ul></div>
        <div class="set"><h3>Настройки</h3><ul>${p.settings.map((t) => `<li>${t}</li>`).join('')}</ul></div>
      </div>
    </div>
    <div class="r">${AD[p.key]()}<p class="cap">Макет объявления. Фото сгенерированы, тексты и цены — пример; в работе — ваши объекты и цены</p></div>
  </div>
  ${foot(i + 2)}
</section>`,
).join('')}

<section class="page dark">
  ${brand}
  <div class="plan">
    <div>
      <p class="label">Стоимость</p>
      <h2 style="margin:2mm 0 0">Бюджет и ведение по каждой площадке<span class="dot">.</span></h2>
      <table class="bt" style="margin-top:7mm">
        <tr><th>Площадка</th><th>Рекламный бюджет</th><th>Ведение</th></tr>
        ${PLATFORMS.map((p) => `<tr><td>${SHORT[p.name] ?? p.name}</td><td class="v">${FROM.has(p.name) ? 'от ' : ''}${rub(BUDGET[p.name])}</td><td class="v">${rub(FEE[p.name])}</td></tr>`).join('')}
      </table>
    </div>
    <div class="side">
      <div class="terms">
        <p><b>Входит:</b> креативы и тексты, настройка кабинетов и целей, ведение, еженедельный отчёт.</p>
        <p><b>Рекламный бюджет</b> — рекомендуемый на первый месяц, оплачивается в кабинеты площадок отдельно, плюс НДС. После теста перераспределяем его туда, где заявка дешевле.</p>
        <p><b>Оплата</b> ведения — помесячно, в начале месяца. Договор без минимального срока.</p>
      </div>
    </div>
  </div>
  <div class="cta">
    <p>Начнём с трёх площадок, через две недели оставим те, что приводят заявки дешевле.</p>
    <div class="contacts">+7 996 347-00-65<br>Telegram @Daniil_065</div>
  </div>
  ${foot(PAGES)}
</section>
</body></html>`;

(async () => {
  const dir = path.join(SITE_OUT, 'kp-src');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'kk69.html'), html);
  fs.cpSync(path.join(__dirname, 'img'), path.join(dir, 'img'), { recursive: true, filter: (f) => !/\.(png|json|err)$/.test(f) });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1123, height: 794 }, deviceScaleFactor: 2 });
  await p.goto('http://127.0.0.1:8088/kp-src/kk69.html', { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  // проверка: ничего не вылезает за страницу
  const over = await p.evaluate(() =>
    [...document.querySelectorAll('.page')].map((pg, i) => {
      const r = pg.getBoundingClientRect();
      const bad = [...pg.querySelectorAll('*')].filter((el) => {
        if (el.closest('.glow, .bigmark')) return false;
        const e = el.getBoundingClientRect();
        return e.width && (e.right > r.right + 1 || e.bottom > r.bottom + 1);
      });
      const foot = pg.querySelector('.foot').getBoundingClientRect();
      const content = [...pg.children].filter((c) => !c.matches('.foot, .glow, .bigmark')).map((c) => c.getBoundingClientRect().bottom);
      return { page: i + 1, overflow: bad.length, gapToFoot: Math.round(foot.top - Math.max(...content)) };
    }),
  );
  console.log(JSON.stringify(over));
  const outDir = process.argv[2] ?? __dirname;
  const pages = await p.$$('.page');
  for (let i = 0; i < pages.length; i++) await pages[i].screenshot({ path: path.join(__dirname, `k-${i + 1}.png`) });
  const file = path.join(outDir, 'KP_69_KarkasKomfort_novye_ploshchadki.pdf');
  await p.pdf({ path: file, width: '297mm', height: '210mm', printBackground: true, preferCSSPageSize: true });
  await b.close();
  console.log('ok', file);
})();
