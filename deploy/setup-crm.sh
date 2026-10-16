#!/usr/bin/env bash
# Однократная установка кабинета Корпорации (задачи, календарь, документы, сотрудники) на VPS сайта.
# Перед запуском: A-запись crm.marketing-studio.pro -> IP сервера и уже выполненный deploy/setup-server.sh.
# Запуск на сервере под root (логин первого администратора можно не указывать, по умолчанию admin):
#   curl -fsSL https://raw.githubusercontent.com/dkaratsapov-web/marketing-studio/main/deploy/setup-crm.sh | bash -s -- crm.marketing-studio.pro admin
#
# Что делает:
#   1. ставит Docker (если его нет) и при малой памяти добавляет подкачку;
#   2. пишет /opt/korp-cabinet/.env: адрес кабинета и четыре раздела меню (ключи сервисов дописываются вручную);
#   3. скачивает папку crm/ из репозитория, собирает и запускает контейнер на 127.0.0.1;
#   4. добавляет сайт в nginx и выпускает HTTPS-сертификат, сайт marketing-studio.pro не трогает;
#   5. создаёт первого администратора и печатает его пароль один раз;
#   6. включает ночной бэкап базы и разрешает GitHub обновлять кабинет при деплое.
# Повторный запуск безопасен: .env, база и сертификат сохраняются.
set -euo pipefail

DOMAIN="${1:-crm.marketing-studio.pro}"
ADMIN_LOGIN="${2:-admin}"
REPO_RAW="https://raw.githubusercontent.com/dkaratsapov-web/marketing-studio/main"
APP_DIR="/opt/korp-cabinet"
UPDATER="/usr/local/sbin/korp-cabinet-update"
DEPLOY_USER="deploy"
NGINX_SITE="/etc/nginx/sites-available/korp-cabinet.conf"

[ "$(id -u)" -eq 0 ] || { echo "Запустите под root." >&2; exit 1; }
[[ "${DOMAIN}" =~ ^[a-z0-9.-]+$ ]] || { echo "Неверный домен: ${DOMAIN}" >&2; exit 1; }
[[ "${ADMIN_LOGIN}" =~ ^[A-Za-z0-9._@-]+$ ]] || { echo "Логин: латиница, цифры, точка, дефис или e-mail" >&2; exit 1; }
id "${DEPLOY_USER}" >/dev/null 2>&1 && command -v nginx >/dev/null \
  || { echo "Сначала запустите deploy/setup-server.sh (nginx и пользователь deploy)." >&2; exit 1; }

echo "==> Память и Docker"
mem_mb=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
if [ "${mem_mb}" -lt 2000 ] && ! swapon --show | grep -q .; then
  # Сборка образа с Chromium на 1 ГБ памяти без подкачки падает
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "    Памяти ${mem_mb} МБ, добавлена подкачка 2 ГБ"
fi
if ! command -v docker >/dev/null || ! docker compose version >/dev/null 2>&1; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y -qq docker.io docker-compose-v2 cron curl rsync >/dev/null
  systemctl enable --now docker >/dev/null
fi
echo "    $(docker --version)"

echo "==> Настройки ${APP_DIR}/.env"
install -d -m 700 -o root -g root "${APP_DIR}"
if [ ! -f "${APP_DIR}/.env" ]; then
  # Свободный локальный порт: на сервере уже работает бот заявок и могут появиться другие службы
  port=3100
  while ss -ltnH "( sport = :${port} )" | grep -q .; do port=$((port + 1)); done
  umask 077
  cat > "${APP_DIR}/.env" <<ENV
# Кабинет Корпорации. Формат строго НАЗВАНИЕ=значение, без пробелов вокруг =.
# После правки: ${UPDATER} main
DOMAIN=${DOMAIN}
PUBLIC_URL=https://${DOMAIN}
ALLOWED_ORIGINS=https://${DOMAIN}
APP_PORT=${port}
COMPOSE_PROFILES=
LOG_LEVEL=info

# В меню только эти разделы; можно дописать templates (управление шаблонами документов)
ADMIN_SECTIONS=tasks,calendar,docs,staff
# Квалификатор заявок в кабинете не используется: заявки с сайта идут в Telegram через lead-bot
QUALIFIER_AI=off

# Напоминания о встречах и план дня в Telegram (бот от @BotFather)
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
# Телемост и Zoom одной кнопкой
TELEMOST_TOKEN=
ZOOM_ACCOUNT_ID=
ZOOM_CLIENT_ID=
ZOOM_CLIENT_SECRET=
ZOOM_USER=
# ИИ: «Собрать с ИИ» в документах и ассистент
YANDEX_GPT_API_KEY=
YANDEX_GPT_FOLDER_ID=
# Вход через Яндекс ID
YANDEX_CLIENT_ID=
YANDEX_CLIENT_SECRET=
ADMIN_ALLOWED_DOMAINS=
ENV
  umask 022
  echo "    .env создан (читает только root)"
else
  echo "    .env уже есть, оставляю как есть"
fi
APP_PORT="$(grep -E '^APP_PORT=' "${APP_DIR}/.env" | cut -d= -f2-)"
APP_PORT="${APP_PORT:-3100}"

echo "==> Программа обновления"
curl -fsSL "${REPO_RAW}/deploy/crm-update.sh" -o "${UPDATER}.new"
install -m 755 -o root -g root "${UPDATER}.new" "${UPDATER}" && rm -f "${UPDATER}.new"
# GitHub при деплое может только запустить обновление кабинета, остальное deploy недоступно
echo "${DEPLOY_USER} ALL=(root) NOPASSWD: ${UPDATER}" > /etc/sudoers.d/korp-cabinet
chmod 440 /etc/sudoers.d/korp-cabinet
visudo -cf /etc/sudoers.d/korp-cabinet >/dev/null

echo "==> Сборка и запуск (первый раз несколько минут)"
rm -f "${APP_DIR}/.tree"
"${UPDATER}" main

echo "==> nginx: ${DOMAIN} -> 127.0.0.1:${APP_PORT}"
if [ -f "${NGINX_SITE}" ] && grep -q "managed by Certbot" "${NGINX_SITE}"; then
  sed -i -E "s|proxy_pass http://127\.0\.0\.1:[0-9]+;|proxy_pass http://127.0.0.1:${APP_PORT};|" "${NGINX_SITE}"
else
  cat > "${NGINX_SITE}" <<NGINX
# Кабинет Корпорации (deploy/setup-crm.sh). HTTPS дописывает certbot.
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};
    client_max_body_size 120m;

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }
}
NGINX
fi
ln -sf "${NGINX_SITE}" /etc/nginx/sites-enabled/korp-cabinet.conf
if ! nginx -t 2>/tmp/korp-nginx.log; then
  # Сайт не ломаем: убираем конфиг кабинета, если nginx его не принял
  rm -f "${NGINX_SITE}" /etc/nginx/sites-enabled/korp-cabinet.conf
  cat /tmp/korp-nginx.log
  echo "nginx не принял конфиг кабинета, он удалён, сайт работает как раньше. Пришлите вывод выше." >&2
  exit 1
fi
systemctl reload nginx

echo "==> HTTPS"
server_ip="$(curl -4 -fsS --max-time 10 https://api.ipify.org || true)"
domain_ip="$(getent ahostsv4 "${DOMAIN}" 2>/dev/null | awk 'NR==1 {print $1}' || true)"
if certbot certificates 2>/dev/null | grep -qE "Domains:.*\b${DOMAIN//./\\.}\b"; then
  echo "    Сертификат для ${DOMAIN} уже есть"
elif [ -n "${domain_ip}" ]; then
  # Свой IP сервер узнаёт через внешний сервис, который бывает недоступен: пробуем выпустить
  # сертификат, как только домен резолвится, а certbot сам проверит, что он ведёт сюда
  certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos --register-unsafely-without-email --redirect \
    || echo "    ! Сертификат не выпущен. Повторите позже: certbot --nginx -d ${DOMAIN} --redirect"
else
  echo "    ! ${DOMAIN} пока не указывает на этот сервер (${server_ip:-IP неизвестен}, DNS: ${domain_ip:-нет записи})."
  echo "      Добавьте A-запись и запустите скрипт ещё раз: он выпустит сертификат."
fi

echo "==> Первый администратор"
admin_cli() { (cd "${APP_DIR}" && docker compose exec -T app node --disable-warning=ExperimentalWarning scripts/admin.js "$@" </dev/null); }
if [ -z "$(admin_cli list 2>/dev/null)" ]; then
  admin_cli add "${ADMIN_LOGIN}" "Администратор" --admin
  echo "    Сохраните пароль выше: он показывается один раз."
else
  echo "    Сотрудники уже есть:"
  admin_cli list | sed 's/^/      /'
fi

echo "==> Ночной бэкап"
cat > /etc/cron.d/korp-cabinet-backup <<CRON
# Копия базы кабинета каждый день в 03:17, хранятся 14 последних (${APP_DIR}/data/backups)
17 3 * * * root cd ${APP_DIR} && docker compose exec -T app node --disable-warning=ExperimentalWarning scripts/backup.js --keep 14 >> /var/log/korp-cabinet-backup.log 2>&1
CRON

cat <<DONE

============================================================
Готово. Кабинет: https://${DOMAIN}/admin/
Логин: ${ADMIN_LOGIN}, пароль напечатан выше.

Telegram, Телемост, ИИ и вход через Яндекс подключаются ключами в ${APP_DIR}/.env
(nano ${APP_DIR}/.env), затем: ${UPDATER} main
Новый пароль администратору:
  cd ${APP_DIR} && docker compose exec app node scripts/admin.js passwd ${ADMIN_LOGIN}
Код кабинета обновляется сам при каждом деплое сайта из GitHub.
============================================================
DONE
