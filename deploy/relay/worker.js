// Ретранслятор Telegram Bot API для сервера заявок в России.
// С российского VPS api.telegram.org недоступен, а Cloudflare Worker стоит за границей и пересылает запрос.
// Пропускает только запросы с секретным заголовком X-Relay-Key и только три метода бота.
// Установка: Cloudflare -> Workers & Pages -> Create -> вставить этот код -> Deploy,
// затем Settings -> Variables and Secrets -> секрет RELAY_KEY (тот же ключ, что на сервере).

const ALLOWED = new Set(["getMe", "getUpdates", "sendMessage"]);

const relay = {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Проверка, что ретранслятор жив и доступен с сервера
    if (url.pathname === "/") return new Response("relay ok");

    if (!env.RELAY_KEY || request.headers.get("X-Relay-Key") !== env.RELAY_KEY) {
      return new Response("forbidden", { status: 403 });
    }

    const match = url.pathname.match(/^\/bot\d+:[\w-]+\/(\w+)$/);
    if (!match || !ALLOWED.has(match[1])) {
      return new Response("not found", { status: 404 });
    }

    const init = { method: request.method, headers: { "Content-Type": "application/json" } };
    if (request.method === "POST") init.body = await request.text();

    const res = await fetch(`https://api.telegram.org${url.pathname}${url.search}`, init);
    return new Response(await res.text(), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  },
};

export default relay;
