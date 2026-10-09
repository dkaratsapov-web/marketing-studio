#!/usr/bin/env bash
# Однократная установка приёмника заявок (заявки с сайта -> Telegram).
# Перед запуском: создать бота у @BotFather, добавить его в группу с Даниилом и Максимом
# и написать в группе любое сообщение, например /start.
# Запуск на сервере под root (токен бота вставить вместо ТОКЕН):
#   curl -fsSL https://raw.githubusercontent.com/dkaratsapov-web/marketing-studio/main/deploy/setup-leads.sh | bash -s -- ТОКЕН
# Если api.telegram.org с сервера недоступен, через ретранслятор deploy/relay/worker.js:
#   ... | bash -s -- ТОКЕН https://АДРЕС.workers.dev КЛЮЧ
# Повторный запуск безопасен: обновит код бота и при необходимости заново найдёт чат.
set -euo pipefail

TOKEN="${1:-}"
RELAY_URL="${2:-}"
RELAY_KEY="${3:-}"
REPO_RAW="https://raw.githubusercontent.com/dkaratsapov-web/marketing-studio/main"
DEPLOY_USER="deploy"
BOT_DIR="/home/${DEPLOY_USER}/lead-bot"
ENV_DIR="/etc/marketing-studio"
ENV_FILE="${ENV_DIR}/lead.env"
DATA_DIR="/var/lib/marketing-studio"

[ "$(id -u)" -eq 0 ] || { echo "Запустите под root." >&2; exit 1; }
id "${DEPLOY_USER}" >/dev/null 2>&1 || { echo "Сначала запустите deploy/setup-server.sh." >&2; exit 1; }
if [ -z "${TOKEN}" ] && [ -f "${ENV_FILE}" ]; then
  TOKEN="$(grep '^BOT_TOKEN=' "${ENV_FILE}" | cut -d= -f2-)"
fi
[ -n "${TOKEN}" ] || { echo "Передайте токен бота: ... | bash -s -- ТОКЕН" >&2; exit 1; }
if [ -z "${RELAY_URL}" ] && [ -f "${ENV_FILE}" ]; then
  RELAY_URL="$(grep '^TG_API=' "${ENV_FILE}" | cut -d= -f2- | grep -v '^https://api.telegram.org$' || true)"
  RELAY_KEY="$(grep '^RELAY_KEY=' "${ENV_FILE}" | cut -d= -f2- || true)"
fi
RELAY_URL="${RELAY_URL%/}"
TG_BASE="${RELAY_URL:-https://api.telegram.org}"
if [ -n "${RELAY_URL}" ] && [ -z "${RELAY_KEY}" ]; then
  echo "Для ретранслятора нужен ключ: ... | bash -s -- ТОКЕН АДРЕС КЛЮЧ" >&2; exit 1
fi

# Только IPv4 и ограничение по времени: без них curl может бесконечно ждать IPv6, которого у VPS нет
api() { curl -4 -fsS --connect-timeout 8 -m 20 -H "X-Relay-Key: ${RELAY_KEY}" "${TG_BASE}/bot${TOKEN}/$1"; }

echo "==> Проверяю связь сервера с Telegram (${TG_BASE})"
if [ -n "${RELAY_URL}" ]; then
  # Ответ сначала в переменную: с pipefail ранний выход grep -q ложно ронял бы проверку
  RELAY_ANSWER="$(curl -4 -sS --connect-timeout 8 -m 15 "${RELAY_URL}/" 2>/tmp/tg-check.err || true)"
  if [ "${RELAY_ANSWER}" != "relay ok" ]; then
    echo "    Ретранслятор ${RELAY_URL} не отвечает с этого сервера:" >&2
    sed 's/^/      /' /tmp/tg-check.err >&2
    echo "    Проверьте адрес (откройте его в браузере, должно быть «relay ok») и пришлите этот вывод." >&2
    exit 2
  fi
elif ! curl -4 -sS --connect-timeout 8 -m 15 -o /dev/null https://api.telegram.org/ 2>/tmp/tg-check.err; then
  echo "    Сервер не может достучаться до api.telegram.org:" >&2
  sed 's/^/      /' /tmp/tg-check.err >&2
  echo "    Telegram API недоступен из этого дата-центра: нужен ретранслятор (deploy/relay/worker.js)." >&2
  exit 2
fi
echo "    Связь есть"

echo "==> Проверяю токен"
BOT_NAME="$(api getMe | python3 -c 'import json,sys; print(json.load(sys.stdin)["result"]["username"])')" \
  || { echo "Telegram не принял токен (или ключ ретранслятора). Проверьте, что скопировали их целиком." >&2; exit 1; }
echo "    Бот: @${BOT_NAME}"

echo "==> Ищу группу, куда добавлен бот"
CHAT_ID="$(grep '^CHAT_IDS=' "${ENV_FILE}" 2>/dev/null | cut -d= -f2- || true)"
if [ -z "${CHAT_ID}" ]; then
  find_chats() {
    api "getUpdates?allowed_updates=%5B%22message%22,%22my_chat_member%22%5D" | python3 -c '
import json, sys
seen = {}
for u in json.load(sys.stdin).get("result", []):
    for key in ("message", "my_chat_member"):
        chat = (u.get(key) or {}).get("chat")
        if chat and chat["type"] in ("group", "supergroup", "private"):
            seen[chat["id"]] = (chat["type"], chat.get("title") or chat.get("first_name") or "")
for cid, (kind, title) in seen.items():
    print(f"{cid}\t{kind}\t{title}")
'
  }
  for attempt in 1 2 3; do
    CHATS="$(find_chats || true)"
    LEAD_GROUPS="$(printf '%s\n' "${CHATS}" | awk -F'\t' '$2!="private" && $1!=""')"
    if [ -n "${LEAD_GROUPS}" ]; then break; fi
    echo "    Бот пока не видит ни одной группы."
    echo "    Добавьте @${BOT_NAME} в группу с Даниилом и Максимом, напишите там /start и нажмите Enter."
    read -r _ < /dev/tty || true
  done
  [ -n "${LEAD_GROUPS:-}" ] || { echo "Группа не найдена. Запустите скрипт ещё раз после добавления бота." >&2; exit 1; }

  if [ "$(printf '%s\n' "${LEAD_GROUPS}" | wc -l)" -eq 1 ]; then
    CHAT_ID="$(printf '%s\n' "${LEAD_GROUPS}" | cut -f1)"
  else
    echo "    Бот состоит в нескольких группах:"
    printf '%s\n' "${LEAD_GROUPS}" | awk -F'\t' '{printf "      %d) %s\n", NR, $3}'
    printf "    Номер группы для заявок: "
    read -r N < /dev/tty
    CHAT_ID="$(printf '%s\n' "${LEAD_GROUPS}" | sed -n "${N}p" | cut -f1)"
  fi
fi
echo "    Чат для заявок: ${CHAT_ID}"

echo "==> Код бота"
install -d -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "${BOT_DIR}" "${DATA_DIR}"
curl -fsSL "${REPO_RAW}/deploy/lead-bot.py" -o "${BOT_DIR}/lead-bot.py"
chown "${DEPLOY_USER}:${DEPLOY_USER}" "${BOT_DIR}/lead-bot.py"
chmod 700 "${DATA_DIR}"

install -d -m 750 -g "${DEPLOY_USER}" "${ENV_DIR}"
umask 027
cat > "${ENV_FILE}" <<ENV
BOT_TOKEN=${TOKEN}
CHAT_IDS=${CHAT_ID}
TG_API=${TG_BASE}
RELAY_KEY=${RELAY_KEY}
LEAD_LOG=${DATA_DIR}/leads.jsonl
PORT=8787
ENV
chgrp "${DEPLOY_USER}" "${ENV_FILE}"
umask 022

echo "==> Служба lead-bot"
cat > /etc/systemd/system/lead-bot.service <<UNIT
[Unit]
Description=Заявки с сайта marketing-studio.pro в Telegram
After=network-online.target
Wants=network-online.target

[Service]
User=${DEPLOY_USER}
EnvironmentFile=${ENV_FILE}
ExecStart=/usr/bin/python3 ${BOT_DIR}/lead-bot.py
Restart=always
RestartSec=3
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=${DATA_DIR}
PrivateTmp=true

[Install]
WantedBy=multi-user.target
UNIT
# GitHub при деплое обновляет код бота и перезапускает только эту службу
echo "${DEPLOY_USER} ALL=(root) NOPASSWD: /usr/bin/systemctl restart lead-bot" > /etc/sudoers.d/lead-bot
chmod 440 /etc/sudoers.d/lead-bot
systemctl daemon-reload
systemctl enable --now lead-bot >/dev/null
systemctl restart lead-bot

echo "==> nginx: /api/lead -> бот"
cat > /etc/nginx/snippets/lead-api.conf <<'NGINX'
location = /api/lead {
    proxy_pass http://127.0.0.1:8787;
    proxy_set_header X-Real-IP $remote_addr;
    client_max_body_size 16k;
}
location = /api/lead/health {
    proxy_pass http://127.0.0.1:8787;
}
NGINX
CONF="/etc/nginx/sites-available/marketing-studio"
if ! grep -q "snippets/lead-api" "${CONF}"; then
  # Подключаем в каждый server-блок сайта (http и https, который дописал certbot)
  sed -i 's#^\(\s*\)root /var/www/marketing-studio;#&\n\1include snippets/lead-api*.conf;#' "${CONF}"
fi
nginx -t
systemctl reload nginx

echo "==> Проверочная заявка"
sleep 1
RESULT="$(curl -sS -X POST http://127.0.0.1:8787/api/lead -H 'Content-Type: application/json' \
  -d '{"source":"test","phone":"+7 (900) 000-00-00","name":"Проверка: бот подключён"}' || true)"
echo "    Ответ: ${RESULT}"

cat <<DONE

============================================================
Готово. В группе должно появиться сообщение «Проверка связи».
Заявки с сайта теперь приходят туда же. Копия каждой заявки: ${DATA_DIR}/leads.jsonl
Если сообщения нет: journalctl -u lead-bot -n 50
============================================================
DONE
