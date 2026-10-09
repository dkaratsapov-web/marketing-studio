#!/usr/bin/env bash
# Однократная настройка VPS (Ubuntu 22.04) под сайт Корпорации.
# Запуск на сервере под root:
#   curl -fsSL https://raw.githubusercontent.com/dkaratsapov-web/marketing-studio/main/deploy/setup-server.sh | bash -s -- marketing-studio.pro почта@для.ssl
#
# Что делает:
#   1. ставит nginx, certbot и rsync;
#   2. создаёт пользователя deploy, через которого GitHub будет заливать сайт;
#   3. настраивает nginx на папку /var/www/marketing-studio;
#   4. если домен уже смотрит на этот сервер, выпускает SSL-сертификат (https);
#   5. печатает ключ, который нужно добавить в секреты GitHub.
# Скрипт можно запускать повторно: он ничего не ломает и, например, довыпустит SSL, когда заработает DNS.
set -euo pipefail

DOMAIN="${1:-marketing-studio.pro}"
EMAIL="${2:-}"
SITE_DIR="/var/www/marketing-studio"
DEPLOY_USER="deploy"
KEY="/home/${DEPLOY_USER}/.ssh/github_deploy"

if [ "$(id -u)" -ne 0 ]; then
  echo "Запустите под root (или через sudo)." >&2
  exit 1
fi

echo "==> Ставлю nginx, certbot, rsync"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx rsync curl dnsutils >/dev/null

echo "==> Пользователь ${DEPLOY_USER} и папка сайта"
id "${DEPLOY_USER}" >/dev/null 2>&1 || adduser --disabled-password --gecos "" "${DEPLOY_USER}" >/dev/null
mkdir -p "${SITE_DIR}"
if [ ! -f "${SITE_DIR}/index.html" ]; then
  cat > "${SITE_DIR}/index.html" <<'HTML'
<!doctype html><meta charset="utf-8"><title>Корпорация</title>
<body style="background:#050505;color:#fff;font:16px system-ui;display:grid;place-items:center;height:100vh;margin:0">
Сайт скоро будет здесь</body>
HTML
fi
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${SITE_DIR}"

echo "==> Ключ для деплоя из GitHub"
install -d -m 700 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "/home/${DEPLOY_USER}/.ssh"
if [ ! -f "${KEY}" ]; then
  sudo -u "${DEPLOY_USER}" ssh-keygen -t ed25519 -N "" -C "github-deploy@${DOMAIN}" -f "${KEY}" >/dev/null
fi
AUTH="/home/${DEPLOY_USER}/.ssh/authorized_keys"
touch "${AUTH}"
grep -qxF "$(cat "${KEY}.pub")" "${AUTH}" || cat "${KEY}.pub" >> "${AUTH}"
chown "${DEPLOY_USER}:${DEPLOY_USER}" "${AUTH}"
chmod 600 "${AUTH}"

echo "==> nginx для ${DOMAIN}"
CONF="/etc/nginx/sites-available/marketing-studio"
# Если certbot уже дописал в конфиг https, не перетираем его
if [ ! -f "${CONF}" ] || ! grep -q "managed by Certbot" "${CONF}"; then
  cat > "${CONF}" <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

    root ${SITE_DIR};
    index index.html;
    # Приёмник заявок (появляется после deploy/setup-leads.sh)
    include snippets/lead-api*.conf;

    # Статический экспорт Next.js: страницы лежат как папка/index.html
    location / {
        try_files \$uri \$uri/ \$uri.html =404;
    }

    # Файлы с хешем в имени можно кешировать надолго
    location /_next/static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    error_page 404 /404.html;

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
}
NGINX
fi
ln -sf "${CONF}" /etc/nginx/sites-enabled/marketing-studio
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "==> Проверяю, смотрит ли домен на этот сервер"
SERVER_IP="$(curl -fsS4 https://ifconfig.me || hostname -I | awk '{print $1}')"
DOMAIN_IP="$(dig +short A "${DOMAIN}" | tail -n1)"
WWW_IP="$(dig +short A "www.${DOMAIN}" | tail -n1)"
echo "    IP сервера: ${SERVER_IP}"
echo "    ${DOMAIN} -> ${DOMAIN_IP:-нет записи}"
echo "    www.${DOMAIN} -> ${WWW_IP:-нет записи}"

if [ "${DOMAIN_IP}" = "${SERVER_IP}" ] && [ "${WWW_IP}" = "${SERVER_IP}" ]; then
  if [ -n "${EMAIL}" ]; then
    certbot --nginx -d "${DOMAIN}" -d "www.${DOMAIN}" --redirect --agree-tos -m "${EMAIL}" --non-interactive
  else
    certbot --nginx -d "${DOMAIN}" -d "www.${DOMAIN}" --redirect --agree-tos --register-unsafely-without-email --non-interactive
  fi
  SSL="готов, сайт открывается по https"
else
  SSL="пока не выпущен: DNS ещё не указывает на этот сервер. Когда записи обновятся, запустите эту же команду ещё раз"
fi

cat <<DONE

============================================================
Готово. SSL: ${SSL}.

Добавьте в GitHub три секрета:
  github.com/dkaratsapov-web/marketing-studio -> Settings -> Secrets and variables -> Actions -> New repository secret

  VPS_HOST     ${SERVER_IP}
  VPS_USER     ${DEPLOY_USER}
  VPS_SSH_KEY  весь текст ниже, от первой до последней строки BEGIN/END включительно:

$(cat "${KEY}")
============================================================
DONE
