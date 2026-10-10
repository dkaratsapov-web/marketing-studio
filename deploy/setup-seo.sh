#!/usr/bin/env bash
# Настройки сервера для поиска. Запускать один раз на VPS под root:
#   sudo bash setup-seo.sh marketing-studio.pro
#
# Что делает:
#   1. www.<домен> навсегда (301) перенаправляет на <домен> без www:
#      у поиска один главный адрес, Вебмастер не видит двух зеркал;
#   2. сжимает gzip ещё и sitemap.xml, robots.txt и текстовые файлы.
# Основной конфиг nginx не переписывается: правило лежит в отдельном файле
# и подключается строкой include рядом с приёмником заявок. Повторный запуск безопасен.
set -euo pipefail

DOMAIN="${1:-marketing-studio.pro}"
CONF="/etc/nginx/sites-available/marketing-studio"
SNIPPET="/etc/nginx/snippets/seo-redirect.conf"

[ -f "${CONF}" ] || { echo "Нет ${CONF}: сначала запустите deploy/setup-server.sh"; exit 1; }

echo "==> Редирект www.${DOMAIN} -> ${DOMAIN}"
mkdir -p /etc/nginx/snippets
cat > "${SNIPPET}" <<NGINX
# Главное зеркало без www (deploy/setup-seo.sh)
if (\$host = www.${DOMAIN}) {
    return 301 https://${DOMAIN}\$request_uri;
}
NGINX

# Подключаем правило в каждый server-блок сайта (http и https), если ещё не подключено
if ! grep -q "snippets/seo-redirect.conf" "${CONF}"; then
  cp "${CONF}" "${CONF}.bak-seo"
  sed -i 's|^\(\s*\)include snippets/lead-api\*\.conf;|&\n\1include snippets/seo-redirect.conf;|' "${CONF}"
fi

echo "==> gzip для sitemap.xml, robots.txt и текста"
if grep -q "gzip_types text/css application/javascript application/json image/svg+xml;" "${CONF}"; then
  sed -i 's|gzip_types text/css application/javascript application/json image/svg+xml;|gzip_types text/css text/plain text/xml application/xml application/javascript application/json image/svg+xml;|' "${CONF}"
fi

nginx -t
systemctl reload nginx

echo "==> Проверка"
curl -sI "https://www.${DOMAIN}/" | grep -iE "^(HTTP|location)" || true
curl -sI "https://${DOMAIN}/sitemap.xml" | grep -iE "^HTTP" || true
echo "Готово: www.${DOMAIN} ведёт на https://${DOMAIN}"
