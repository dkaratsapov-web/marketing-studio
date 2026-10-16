#!/usr/bin/env bash
# Обновление кабинета Корпорации (папка crm/ репозитория) на сервере.
# Ставится скриптом deploy/setup-crm.sh в /usr/local/sbin/korp-cabinet-update.
# GitHub при деплое запускает его через sudo от пользователя deploy:
#   sudo -n /usr/local/sbin/korp-cabinet-update <коммит> [хеш папки crm]
# Код берётся из публичного репозитория по номеру коммита, .env и data/ на сервере не трогаются.
set -euo pipefail
# Docker не должен читать чужой ввод (скрипт установки приходит через curl | bash)
exec </dev/null

REPO="dkaratsapov-web/marketing-studio"
APP_DIR="/opt/korp-cabinet"
REF="${1:-main}"
TREE="${2:-}"

[ "$(id -u)" -eq 0 ] || { echo "Запустите под root." >&2; exit 1; }
# Аргументы приходят из sudo, поэтому пропускаем только номер коммита и хеш
[[ "${REF}" =~ ^([0-9a-f]{40}|main)$ ]] || { echo "Неверный коммит: ${REF}" >&2; exit 1; }
[[ -z "${TREE}" || "${TREE}" =~ ^[0-9a-f]{40}$ ]] || { echo "Неверный хеш: ${TREE}" >&2; exit 1; }
[ -f "${APP_DIR}/.env" ] || { echo "Кабинет не установлен: сначала deploy/setup-crm.sh" >&2; exit 1; }

exec 9>/run/korp-cabinet-update.lock
flock -w 600 9 || { echo "Обновление уже идёт" >&2; exit 1; }

# Если папка crm/ в репозитории не менялась, пересобирать нечего
if [ -n "${TREE}" ] && [ "$(cat "${APP_DIR}/.tree" 2>/dev/null || true)" = "${TREE}" ]; then
  echo "Кабинет без изменений (${TREE:0:7}), пропускаю"
  exit 0
fi

cd "${APP_DIR}"
compose() { docker compose "$@"; }

if compose ps --status running --services 2>/dev/null | grep -qx app; then
  echo "▸ Бэкап базы перед обновлением"
  compose exec -T app node --disable-warning=ExperimentalWarning scripts/backup.js --keep 14 || echo "! бэкап не сделан"
fi

echo "▸ Загружаю код ${REF:0:7}"
TMP="$(mktemp -d)"
trap 'rm -rf "${TMP}"' EXIT
curl -4 -fsSL --connect-timeout 10 -m 300 "https://codeload.github.com/${REPO}/tar.gz/${REF}" -o "${TMP}/src.tgz"
tar -xzf "${TMP}/src.tgz" -C "${TMP}" --wildcards '*/crm/*'
SRC="$(find "${TMP}" -mindepth 2 -maxdepth 2 -type d -name crm | head -n1)"
[ -n "${SRC}" ] && [ -f "${SRC}/docker-compose.yml" ] || { echo "В архиве нет папки crm/" >&2; exit 1; }
rsync -a --delete --exclude /.env --exclude /data/ --exclude /.tree --exclude /.version "${SRC}/" "${APP_DIR}/"
# Папка кабинета закрыта для всех, кроме root: база с клиентами и .env с ключами лежат внутри
chown root:root "${APP_DIR}" && chmod 700 "${APP_DIR}"

echo "▸ Пересобираю и перезапускаю"
mkdir -p data && chown 1000:1000 data && chmod 700 data
compose up -d --build
docker image prune -f >/dev/null

echo "▸ Проверка"
for _ in $(seq 1 45); do
  if compose exec -T app wget -qO- http://127.0.0.1:3000/health >/dev/null 2>&1; then
    echo "${REF}" > .version
    [ -n "${TREE}" ] && echo "${TREE}" > .tree
    echo "  ✓ кабинет работает (${REF:0:7})"
    exit 0
  fi
  sleep 2
done
echo "! Кабинет не ответил за полторы минуты. Последние строки журнала:"
compose ps
compose logs --tail=60 app
exit 1
