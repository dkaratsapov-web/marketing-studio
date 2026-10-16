// «Корпорация: в CRM» — запросы к кабинету. Адрес кабинета и личный ключ сотрудника — в config.js.
importScripts('config.js');

async function call(path, init = {}) {
  let res;
  try {
    res = await fetch(KORP.base + path, { ...init, headers: { authorization: `Bearer ${KORP.token}`, 'content-type': 'application/json' } });
  } catch {
    throw new Error('Кабинет не отвечает: проверьте интернет');
  }
  const body = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error('Ключ расширения отозван или устарел: скачайте расширение заново в кабинете («Парсер» → «Кнопка для карт»)');
  if (!res.ok) throw new Error(body.error || `Кабинет ответил ${res.status}`);
  return body;
}

chrome.runtime.onMessage.addListener((msg, sender, send) => {
  const run =
    msg.type === 'me'
      ? call('/ext/api/me')
      : msg.type === 'save'
        ? call('/ext/api/places', { method: 'POST', body: JSON.stringify(msg.payload) })
        : Promise.reject(new Error('Неизвестная команда'));
  run.then((data) => send({ ok: true, data }), (err) => send({ ok: false, error: err.message }));
  return true;
});
