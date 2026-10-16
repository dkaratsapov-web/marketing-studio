// «Корпорация: в CRM» — кнопка на Яндекс Картах и 2ГИС. Сотрудник сам открывает карточку организации,
// кнопка собирает с неё название, телефоны, сайт, адрес и отправляет в список в кабинете.
// Вёрстка карт меняется, поэтому поля открываются в окне: перед сохранением их можно поправить.

(() => {
  if (window.__korpCrm) return;
  window.__korpCrm = true;

  const SITE = location.hostname.includes('2gis') ? '2gis' : 'yandex';
  const SOCIAL = [
    ['vk', /(^|\.)vk\.(com|ru)$/],
    ['telegram', /^(t|telegram)\.me$/],
    ['whatsapp', /(^|\.)(wa\.me|whatsapp\.com)$/],
    ['instagram', /(^|\.)instagram\.com$/],
    ['ok', /(^|\.)ok\.ru$/],
    ['youtube', /(^|\.)youtube\.com$/],
    ['dzen', /(^|\.)dzen\.ru$/],
  ];
  const OWN = /(^|\.)(yandex\.\w+|ya\.ru|yastatic\.net|2gis\.\w+|link\.2gis\.ru|google\.\w+|apple\.com|play\.google\.com)$/;
  const PHONE = /(?:\+7|8)[\s(-]*\d{3,5}[\s)-]*\d{1,3}[\s-]?\d{2}[\s-]?\d{2}/g;

  const txt = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const first = (root, sels) => {
    for (const s of sels) {
      const el = root.querySelector(s);
      if (txt(el)) return txt(el);
    }
    return '';
  };

  /** Открытая карточка: самый «глубокий» блок, где есть заголовок организации. */
  function cardRoot() {
    const sels =
      SITE === 'yandex'
        ? ['.business-card-view', '.orgpage-view', '[class*="business-card-view"]', '.sidebar-view._name_search-result ~ .sidebar-view', '.sidebar-view:not(._hidden)']
        : ['[data-name="card"]', '[class*="_card_"]', 'aside', 'main'];
    for (const s of sels) {
      const el = [...document.querySelectorAll(s)].find((x) => x.offsetParent !== null && x.querySelector('h1, h2'));
      if (el) return el;
    }
    return document.body;
  }

  /** Ссылка из 2ГИС бывает переходником link.2gis.ru: настоящий адрес — в тексте ссылки. */
  function realUrl(a) {
    try {
      const u = new URL(a.href);
      if (/link\.2gis\.ru$/.test(u.hostname)) {
        const t = txt(a);
        return /\.[a-zа-я]{2,}/i.test(t) ? (/^https?:/.test(t) ? t : `https://${t}`) : null;
      }
      if (u.hostname.endsWith('yandex.ru') && u.pathname.startsWith('/redirect')) return u.searchParams.get('url');
      return u.href;
    } catch {
      return null;
    }
  }

  function scrape() {
    const root = cardRoot();
    const name =
      SITE === 'yandex'
        ? first(root, ['.orgpage-header-view__header', '.card-title-view__title-link', '.card-title-view__title', 'h1', 'h2'])
        : first(root, ['h1', 'h2']);
    const category =
      SITE === 'yandex'
        ? first(root, ['.business-categories-view__category', '.orgpage-categories-info-view', '.business-card-title-view__categories'])
        : first(root, ['[class*="rubric"]', 'h1 + div']);
    const address =
      SITE === 'yandex'
        ? first(root, ['.business-contacts-view__address-link', '.orgpage-header-view__address', '.business-contacts-view__address', '[class*="address"]'])
        : first(root, ['[class*="address"]', 'address']);

    const phones = new Set();
    for (const a of root.querySelectorAll('a[href^="tel:"]')) phones.add(a.getAttribute('href').slice(4).trim());
    for (const el of root.querySelectorAll('[class*="phone"], [itemprop="telephone"]')) for (const m of txt(el).matchAll(PHONE)) phones.add(m[0].trim());
    if (!phones.size) for (const m of txt(root).matchAll(PHONE)) phones.add(m[0].trim());

    let website = '';
    const socials = {};
    for (const a of root.querySelectorAll('a[href^="http"]')) {
      const url = realUrl(a);
      if (!url) continue;
      let host;
      try {
        host = new URL(url).hostname.replace(/^www\./, '');
      } catch {
        continue;
      }
      const social = SOCIAL.find(([, re]) => re.test(host));
      if (social) socials[social[0]] ??= url;
      else if (!OWN.test(host) && !website) website = url.replace(/[?#].*$/, '');
    }
    const emails = [...new Set([...root.querySelectorAll('a[href^="mailto:"]')].map((a) => a.getAttribute('href').slice(7).split('?')[0]))];

    const ratingText = first(root, ['.business-rating-badge-view__rating-text', '.business-summary-rating-badge-view__rating', '[class*="rating-text"]', '[class*="rating"]']);
    const rating = /(\d)[.,](\d)/.exec(ratingText);
    const reviews = /(\d[\d\s]*)\s+(отзыв|оцен)/i.exec(txt(root));
    const hours = SITE === 'yandex' ? first(root, ['.business-working-status-view', '.business-working-status-flip-view']) : '';

    // карточка организации: номер в адресе страницы
    const org = SITE === 'yandex' ? /\/org\/(?:[^/]+\/)?(\d{5,})/.exec(location.pathname)?.[1] : /\/firm\/(\d{5,})/.exec(location.pathname)?.[1];
    const link = org ? (SITE === 'yandex' ? `https://yandex.ru/maps/org/${org}/` : `https://2gis.ru/firm/${org}`) : location.href;
    // координаты: ll=долгота,широта у Яндекса, m=долгота,широта у 2ГИС
    const params = new URLSearchParams(location.search);
    const ll = (params.get('ll') ?? params.get('m') ?? '').split(/[,/]/).map(Number);

    return {
      source: SITE,
      orgId: org ?? null,
      link,
      name,
      category,
      address,
      phones: [...phones],
      website,
      emails,
      socials,
      rating: rating ? Number(`${rating[1]}.${rating[2]}`) : null,
      reviews: reviews ? Number(reviews[1].replace(/\s/g, '')) : null,
      hours,
      lon: Number.isFinite(ll[0]) ? ll[0] : null,
      lat: Number.isFinite(ll[1]) ? ll[1] : null,
    };
  }

  // ---------- кнопка и окно ----------

  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;z-index:2147483646;left:16px;bottom:16px;';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      * { box-sizing: border-box; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
      .btn-main { display: inline-flex; align-items: center; gap: 8px; padding: 11px 16px; border: 0; border-radius: 12px; background: #c4f542; color: #050505; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 6px 20px rgba(0,0,0,.25); }
      .btn-main:hover { filter: brightness(.95); }
      .btn-main:focus-visible, button:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible { outline: 2px solid #ff4d9d; outline-offset: 2px; }
      .panel { position: fixed; left: 16px; bottom: 70px; width: min(400px, calc(100vw - 32px)); max-height: calc(100vh - 100px); overflow: auto; padding: 16px; border-radius: 14px; background: #111113; color: #f4f4f5; border: 1px solid #2a2a2e; box-shadow: 0 16px 40px rgba(0,0,0,.45); font-size: 13px; }
      .panel[hidden] { display: none; }
      h2 { margin: 0 0 10px; font-size: 16px; }
      label { display: grid; gap: 4px; margin-bottom: 9px; color: #a1a1aa; font-weight: 600; font-size: 12px; }
      input, textarea, select { width: 100%; padding: 8px 10px; border-radius: 8px; border: 1px solid #2f2f35; background: #1b1b1f; color: #f4f4f5; font-size: 13px; }
      textarea { resize: vertical; min-height: 54px; }
      .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 4px; }
      .row button { padding: 9px 14px; border-radius: 9px; border: 1px solid #2f2f35; background: transparent; color: #f4f4f5; font-weight: 600; cursor: pointer; }
      .row .save { background: #c4f542; border-color: #c4f542; color: #050505; }
      .row button:disabled { opacity: .6; cursor: default; }
      .hint { margin: 0 0 10px; color: #a1a1aa; line-height: 1.4; }
      .msg { margin: 8px 0 0; line-height: 1.4; }
      .msg.ok { color: #c4f542; }
      .msg.bad { color: #ff6b9d; }
      .linkish { border: 0 !important; padding: 0 !important; color: #c4f542 !important; text-decoration: underline; }
    </style>
    <button class="btn-main" type="button" title="Сохранить открытую карточку в кабинет Корпорации">＋ В CRM</button>
    <form class="panel" hidden>
      <h2>В кабинет Корпорации</h2>
      <p class="hint">Проверьте поля. Если телефон на карточке скрыт, нажмите «Показать телефон», потом «Обновить с карточки».</p>
      <label>Название<input name="name" maxlength="200" required></label>
      <label>Категория<input name="category" maxlength="200"></label>
      <label>Адрес<input name="address" maxlength="300"></label>
      <label>Телефоны, по одному в строке<textarea name="phones" rows="2"></textarea></label>
      <label>Сайт<input name="website" maxlength="300"></label>
      <label>Список<select name="list"></select></label>
      <label class="new-list" hidden>Название нового списка<input name="listName" maxlength="120" placeholder="Автосалоны Одинцово"></label>
      <div class="row">
        <button class="save" type="submit">Сохранить</button>
        <button class="refresh linkish" type="button">Обновить с карточки</button>
        <button class="close" type="button">Закрыть</button>
      </div>
      <p class="msg" role="status"></p>
    </form>`;
  document.documentElement.append(host);

  const $ = (s) => shadow.querySelector(s);
  const form = $('form');
  const field = (n) => form.elements.namedItem(n);
  const msg = $('.msg');
  let data = null;
  let listsLoaded = false;

  const send = (type, payload) =>
    new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type, payload }, (r) => resolve(r ?? { ok: false, error: chrome.runtime.lastError?.message ?? 'Расширение не ответило' }));
      } catch (err) {
        resolve({ ok: false, error: 'Расширение обновилось: перезагрузите страницу карт' });
      }
    });

  function say(text, kind = '') {
    msg.textContent = text;
    msg.className = `msg ${kind}`;
  }

  function fillForm() {
    data = scrape();
    field('name').value = data.name;
    field('category').value = data.category;
    field('address').value = data.address;
    field('phones').value = data.phones.join('\n');
    field('website').value = data.website;
    say(data.name ? '' : 'Не вижу открытой карточки организации: откройте её на карте и нажмите «Обновить с карточки».', data.name ? '' : 'bad');
  }

  async function loadLists() {
    if (listsLoaded) return;
    const r = await send('me');
    if (!r.ok) return say(r.error, 'bad');
    listsLoaded = true;
    const remembered = String((await chrome.storage.local.get('list')).list ?? '');
    field('list').replaceChildren(
      ...r.data.lists.map((l) => new Option(`${l.name} (${l.count})`, String(l.id))),
      new Option('+ Новый список…', 'new'),
    );
    field('list').value = r.data.lists.some((l) => String(l.id) === remembered) ? remembered : r.data.lists[0] ? String(r.data.lists[0].id) : 'new';
    $('.new-list').hidden = field('list').value !== 'new';
  }

  $('.btn-main').addEventListener('click', () => {
    if (!form.hidden) return (form.hidden = true);
    form.hidden = false;
    fillForm();
    loadLists();
  });
  $('.close').addEventListener('click', () => (form.hidden = true));
  $('.refresh').addEventListener('click', fillForm);
  field('list').addEventListener('change', () => ($('.new-list').hidden = field('list').value !== 'new'));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const save = $('.save');
    save.disabled = true;
    say('Сохраняю…');
    const isNew = field('list').value === 'new';
    const r = await send('save', {
      listId: isNew ? null : Number(field('list').value),
      listName: isNew ? field('listName').value || null : null,
      place: {
        ...data,
        name: field('name').value.trim(),
        category: field('category').value.trim(),
        address: field('address').value.trim(),
        phones: field('phones').value.split(/\n+/).map((x) => x.trim()).filter(Boolean),
        website: field('website').value.trim(),
      },
    });
    save.disabled = false;
    if (!r.ok) return say(r.error, 'bad');
    chrome.storage.local.set({ list: String(r.data.list.id) });
    listsLoaded = false;
    say(`${r.data.duplicate ? 'Уже было в списке, дополнено' : 'Сохранено'}: «${r.data.list.name}».`, 'ok');
    loadLists();
  });
})();
