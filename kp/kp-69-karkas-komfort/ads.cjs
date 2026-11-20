// Макеты объявлений в интерфейсе площадок: телефон 290×590 px. Интерфейсы упрощённые, не копии.

const CSS = `
.phone { width:290px; height:590px; border-radius:38px; background:#0b0b0b; padding:10px; box-shadow:0 30px 60px -30px rgba(0,0,0,.55), inset 0 0 0 1.5px #2a2a2a; flex:none; }
.scr { width:100%; height:100%; border-radius:29px; overflow:hidden; position:relative; font-family:"Golos Text",sans-serif; font-size:12px; line-height:1.35; }
.notch { position:absolute; top:7px; left:50%; transform:translateX(-50%); width:84px; height:22px; background:#0b0b0b; border-radius:12px; z-index:5; }
.status { height:34px; display:flex; justify-content:space-between; align-items:flex-end; padding:0 22px 4px; font-weight:600; font-size:11px; }
.sk { height:7px; border-radius:4px; background:currentColor; opacity:.13; margin:5px 0; }
.ph { border-radius:8px; overflow:hidden; }
.tag { display:inline-block; font-size:9.5px; padding:1px 5px; border-radius:4px; }
.btn-ad { display:block; text-align:center; font-weight:600; font-size:12.5px; padding:9px; border-radius:9px; }

/* Авито: выдача, рекламная карточка первой */
.av { background:#fff; color:#1a1a1a; }
.av .bar { padding:4px 12px 8px; display:flex; gap:8px; align-items:center; }
.av .search { flex:1; background:#f2f2f2; border-radius:10px; padding:8px 10px; font-size:12px; color:#222; }
.av .chips { display:flex; gap:6px; padding:0 12px 10px; }
.av .chips span { background:#f2f2f2; border-radius:14px; padding:4px 9px; font-size:10.5px; }
.av .grid { display:grid; grid-template-columns:1fr 1fr; gap:10px 8px; padding:0 12px; }
.av .card .ph { height:118px; }
.av .card b { display:block; font-size:13.5px; margin:5px 0 1px; }
.av .card p { font-size:11px; color:#222; }
.av .card small { display:block; font-size:10px; color:#8a8a8a; margin-top:2px; }
.av .card.ad .ph { outline:2px solid #00aaff; outline-offset:-2px; }
.av .card.dim { opacity:.42; filter:grayscale(.7); }
.av .tag { background:#eef7ff; color:#0088cc; }

/* VK: лента, запись с лид-формой */
.vk { background:#edeef0; color:#000; }
.vk .top { background:#fff; padding:2px 14px 9px; font-weight:700; font-size:15px; }
.vk .post { background:#fff; margin-top:8px; padding:12px 0 10px; }
.vk .head { display:flex; gap:8px; align-items:center; padding:0 12px 8px; }
.vk .ava { width:34px; height:34px; border-radius:50%; background:#050505; color:#c4f542; display:grid; place-items:center; font-weight:800; font-size:12px; }
.vk .head b { font-size:12.5px; } .vk .head small { display:block; color:#818c99; font-size:10.5px; }
.vk .txt { padding:0 12px 8px; font-size:12px; }
.vk .ph { border-radius:0; height:180px; }
.vk .cta { display:flex; justify-content:space-between; align-items:center; padding:9px 12px 4px; gap:10px; }
.vk .cta span { font-size:11px; color:#818c99; }
.vk .btn-ad { background:#0077ff; color:#fff; padding:8px 14px; }
.vk .react { display:flex; gap:14px; padding:8px 12px 0; color:#818c99; font-size:11px; }

/* Telegram: канал, рекламное сообщение внизу */
.tg { background:#0e1621; color:#f5f5f5; }
.tg .top { display:flex; gap:9px; align-items:center; padding:2px 12px 9px; background:#17212b; }
.tg .ava { width:32px; height:32px; border-radius:50%; background:#5a8a5e; }
.tg .top b { font-size:13px; } .tg .top small { display:block; color:#7f91a4; font-size:10.5px; }
.tg .feed { padding:10px 10px 0; display:grid; gap:8px; }
.tg .msg { background:#182533; border-radius:12px; padding:9px 11px; color:#f5f5f5; }
.tg .msg.ad { border-left:3px solid #2ea6ff; }
.tg .tag { color:#2ea6ff; font-size:10px; padding:0; }
.tg .msg b { display:block; color:#2ea6ff; font-size:12.5px; margin:2px 0 6px; }
.tg .msg .ph { height:132px; margin-bottom:7px; }
.tg .btn-ad { background:rgba(46,166,255,.14); color:#2ea6ff; margin-top:8px; }

/* MAX: канал, рекламный пост */
.mx { background:#f4f4f8; color:#111; }
.mx .top { display:flex; gap:9px; align-items:center; padding:2px 12px 9px; background:#fff; }
.mx .ava { width:32px; height:32px; border-radius:50%; background:linear-gradient(135deg,#6a5cff,#a46bff); }
.mx .top b { font-size:13px; } .mx .top small { display:block; color:#8b8b99; font-size:10.5px; }
.mx .feed { padding:10px; display:grid; gap:8px; }
.mx .post { background:#fff; border-radius:14px; padding:10px; }
.mx .post .ph { height:150px; margin:6px 0 8px; }
.mx .tag { background:#efecff; color:#5b4bff; }
.mx .btn-ad { background:#5b4bff; color:#fff; margin-top:9px; }

/* SberAds: нативный блок в ленте новостей */
.sb { background:#f6f7f8; color:#111; }
.sb .top { padding:2px 14px 9px; font-weight:700; font-size:15px; background:#fff; }
.sb .feed { padding:10px; display:grid; gap:9px; }
.sb .news { background:#fff; border-radius:12px; padding:10px; display:grid; grid-template-columns:1fr 64px; gap:8px; }
.sb .news i { display:block; height:52px; border-radius:8px; background:#e3e6e9; }
.sb .ad { background:#fff; border-radius:12px; overflow:hidden; }
.sb .ad .ph { height:150px; border-radius:0; }
.sb .ad div.b { padding:9px 11px 11px; }
.sb .tag { background:#e9f6ee; color:#1a8c46; }
.sb .ad b { display:block; font-size:13.5px; margin:5px 0 3px; }
.sb .btn-ad { background:#21a038; color:#fff; margin-top:9px; }
`;

const status = (dark) => `<div class="notch"></div><div class="status" style="color:${dark ? '#fff' : '#111'}"><span>9:41</span><span>●●● 5G</span></div>`;
// фото из Higgsfield: day, evening, build, interior (лежат рядом с html в img/)
const img = (name) => `<div class="ph"><img src="img/${name}.jpg" alt="" style="width:100%;height:100%;object-fit:cover;display:block"></div>`;
const sk = (n, w = [100, 92, 60]) => Array.from({ length: n }, (_, i) => `<div class="sk" style="width:${w[i % w.length]}%"></div>`).join('');

const AD = {
  avito: () => `<div class="phone"><div class="scr av">${status(false)}
    <div class="bar"><div class="search">каркасный дом под ключ</div></div>
    <div class="chips"><span>Дома, дачи</span><span>До 4 млн ₽</span><span>Под ключ</span></div>
    <div class="grid">
      <div class="card ad">${img('day')}<b>2 950 000 ₽</b><p>Каркасный дом 98 м² под ключ, 3 месяца</p><small><span class="tag">Реклама</span> КаркасКомфорт</small></div>
      <div class="card dim">${img('evening')}<b>3 400 000 ₽</b><p>Дом 120 м², брус</p><small>Частное лицо</small></div>
      <div class="card dim">${img('build')}<b>2 100 000 ₽</b><p>Дача 64 м²</p><small>Компания</small></div>
      <div class="card dim">${img('interior')}<b>4 800 000 ₽</b><p>Дом 140 м² с участком</p><small>Агентство</small></div>
    </div></div></div>`,
  vk: () => `<div class="phone"><div class="scr vk">${status(false)}<div class="top">Новости</div>
    <div class="post"><div class="head"><div class="ava">КК</div><div><b>КаркасКомфорт</b><small>Реклама</small></div></div>
    <div class="txt">Каркасный дом под ключ за 3 месяца. Цену фиксируем в договоре — на стройке смета не вырастет. Подберём проект под ваш участок и бюджет 🏡</div>
    ${img('evening')}
    <div class="cta"><span>Расчёт за 1 день</span><a class="btn-ad">Получить расчёт</a></div>
    <div class="react"><span>♡ 214</span><span>💬 18</span><span>↗ 9</span></div></div>
    <div class="post" style="padding:12px">${sk(3)}</div></div></div>`,
  telegram: () => `<div class="phone"><div class="scr tg">${status(true)}
    <div class="top"><div class="ava"></div><div><b>Свой дом за городом</b><small>48 тыс. подписчиков</small></div></div>
    <div class="feed"><div class="msg">${sk(3)}</div><div class="msg">${sk(2, [96, 70])}</div>
    <div class="msg ad"><span class="tag">Реклама</span><b>КаркасКомфорт</b>${img('interior')}
    Каркасный дом под ключ за 3 месяца. Цена в договоре не меняется. 40 проектов с планировками и ценами.
    <a class="btn-ad">Открыть каталог</a></div></div></div></div>`,
  max: () => `<div class="phone"><div class="scr mx">${status(false)}
    <div class="top"><div class="ava"></div><div><b>Дом и участок</b><small>канал</small></div></div>
    <div class="feed"><div class="post">${sk(2, [94, 66])}</div>
    <div class="post"><span class="tag">Реклама</span> <b style="font-size:12.5px">КаркасКомфорт</b>${img('build')}
    Строим каркасные дома круглый год: зимой фундамент и каркас, весной — отделка. Посмотрите проекты с ценами 👇
    <a class="btn-ad">Смотреть проекты</a></div></div></div></div>`,
  sber: () => `<div class="phone"><div class="scr sb">${status(false)}<div class="top">Лента</div>
    <div class="feed"><div class="news"><div>${sk(3, [100, 90, 55])}</div><i></i></div>
    <div class="ad">${img('day')}<div class="b"><span class="tag">Реклама · КаркасКомфорт</span>
    <b>Каркасный дом под ключ от 2,9&nbsp;млн&nbsp;₽</b>Подберём проект под бюджет и участок. Цена в договоре фиксирована.
    <a class="btn-ad">Узнать цену</a></div></div>
    <div class="news"><div>${sk(2, [100, 70])}</div><i></i></div></div></div></div>`,
};

module.exports = { AD, ADS_CSS: CSS };
