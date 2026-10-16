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
# Скрипт приходит через curl | bash: оборачиваем в функцию, чтобы bash прочитал его целиком
# до запуска, а команды Docker не съели остаток из того же потока
main() {

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
# Сорока (soroka-assistant.ru, /opt/kvalificator) — отдельный проект на этом же сервере: его не трогаем никогда
case "${DOMAIN}" in *soroka*) echo "Это адрес Сороки, кабинет Корпорации туда не ставится." >&2; exit 1 ;; esac
# Адрес уже занят другим сайтом в nginx — ничего не меняем, пусть владелец решит
other="$(grep -lE "server_name[^;]*[[:space:]]${DOMAIN//./\\.}([[:space:];]|$)" /etc/nginx/sites-enabled/* 2>/dev/null | grep -v korp-cabinet || true)"
if [ -n "${other}" ]; then
  echo "Адрес ${DOMAIN} уже обслуживает другой сайт: ${other}. Ничего не меняю." >&2
  exit 1
fi
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
# Первая сборка на маленьком сервере бывает дольше проверки: не обрываем установку, nginx и администратор нужны всё равно
"${UPDATER}" main </dev/null || echo "    ! Кабинет ещё запускается, продолжаю установку"

echo "==> nginx: ${DOMAIN} -> 127.0.0.1:${APP_PORT}"
LE_DIR="/etc/letsencrypt/live/${DOMAIN}"
# Конфиг пишем сами и целиком: и для http, и для https. Автоподключение certbot на этом сервере
# не находит блок кабинета среди других сайтов, поэтому сертификат прописываем напрямую
write_site() {
  local proxy
  proxy="    client_max_body_size 120m;

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }"
  if [ "$1" = https ]; then
    cat > "${NGINX_SITE}" <<NGINX
# Кабинет Корпорации (deploy/setup-crm.sh)
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 301 https://\$host\$request_uri; }
}
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name ${DOMAIN};
    ssl_certificate ${LE_DIR}/fullchain.pem;
    ssl_certificate_key ${LE_DIR}/privkey.pem;
$( [ -f /etc/letsencrypt/options-ssl-nginx.conf ] && echo "    include /etc/letsencrypt/options-ssl-nginx.conf;" )
$( [ -f /etc/letsencrypt/ssl-dhparams.pem ] && echo "    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;" )
${proxy}
}
NGINX
  else
    cat > "${NGINX_SITE}" <<NGINX
# Кабинет Корпорации (deploy/setup-crm.sh). HTTPS появится после выпуска сертификата.
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};
${proxy}
}
NGINX
  fi
  ln -sf "${NGINX_SITE}" /etc/nginx/sites-enabled/korp-cabinet.conf
}
apply_site() {
  write_site "$1"
  if nginx -t 2>/tmp/korp-nginx.log; then
    systemctl reload nginx
    echo "    ✓ ${DOMAIN}: $1"
    return 0
  fi
  cat /tmp/korp-nginx.log
  return 1
}
has_cert() { [ -f "${LE_DIR}/fullchain.pem" ] && [ -f "${LE_DIR}/privkey.pem" ]; }

if has_cert; then
  apply_site https || apply_site http || {
    # Сайт не ломаем: убираем конфиг кабинета, если nginx его не принял
    rm -f "${NGINX_SITE}" /etc/nginx/sites-enabled/korp-cabinet.conf
    echo "nginx не принял конфиг кабинета, он удалён, сайты работают как раньше. Пришлите вывод выше." >&2
    exit 1
  }
else
  apply_site http || {
    rm -f "${NGINX_SITE}" /etc/nginx/sites-enabled/korp-cabinet.conf
    echo "nginx не принял конфиг кабинета, он удалён, сайты работают как раньше. Пришлите вывод выше." >&2
    exit 1
  }
fi

echo "==> HTTPS"
if ! has_cert; then
  if getent ahostsv4 "${DOMAIN}" >/dev/null 2>&1; then
    # Только выпуск сертификата: в конфиг его прописываем сами
    certbot certonly --nginx -d "${DOMAIN}" --non-interactive --agree-tos --register-unsafely-without-email \
      || echo "    ! Сертификат не выпущен, вывод выше. Запустите скрипт ещё раз позже."
  else
    echo "    ! ${DOMAIN} пока не резолвится. Добавьте A-запись и запустите скрипт ещё раз."
  fi
  has_cert && { apply_site https || apply_site http; }
fi
if has_cert; then
  # После продления certbot перечитываем nginx, чтобы он взял новый сертификат
  install -d /etc/letsencrypt/renewal-hooks/deploy
  printf '#!/bin/sh\nsystemctl reload nginx\n' > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
  chmod 755 /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
  # Продлевать без автоподключения certbot к nginx: конфиг кабинета уже указывает на файлы сертификата
  sed -i '/^installer = /d' "/etc/letsencrypt/renewal/${DOMAIN}.conf" 2>/dev/null || true
  echo "    ✓ сертификат: ${LE_DIR}"
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
}
main "$@" </dev/null
