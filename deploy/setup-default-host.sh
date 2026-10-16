#!/usr/bin/env bash
# Заглушка nginx для чужих и неизвестных адресов на сервере Корпорации.
# Без неё запрос к домену, у которого на сервере нет своего сайта, nginx отдаёт первому сайту по алфавиту,
# и посетитель видит, например, кабинет Корпорации под чужим адресом. Заглушка просто закрывает соединение.
# Запуск под root (повторный запуск безопасен):
#   curl -fsSL https://raw.githubusercontent.com/dkaratsapov-web/marketing-studio/main/deploy/setup-default-host.sh | bash
# Файлы других проектов не трогает: пишет только /etc/nginx/sites-available/00-default.
set -euo pipefail

main() {
  local site=/etc/nginx/sites-available/00-default
  local link=/etc/nginx/sites-enabled/00-default
  local cert=/etc/letsencrypt/live/crm.marketing-studio.pro

  [ "$(id -u)" -eq 0 ] || { echo "Запустите под root." >&2; exit 1; }
  [ -f "${cert}/fullchain.pem" ] || { echo "Нет сертификата ${cert}: сначала deploy/setup-crm.sh" >&2; exit 1; }
  if grep -rlE "default_server" /etc/nginx/sites-enabled/ 2>/dev/null | grep -v "/00-default$" | grep -q .; then
    echo "В nginx уже есть сайт по умолчанию, ничего не меняю:" >&2
    grep -rlE "default_server" /etc/nginx/sites-enabled/ | grep -v "/00-default$" >&2
    exit 1
  fi

  cat > "${site}" <<NGINX
# Заглушка для неизвестных адресов (deploy/setup-default-host.sh): соединение закрывается без ответа.
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    return 444;
}
server {
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;
    server_name _;
    ssl_certificate ${cert}/fullchain.pem;
    ssl_certificate_key ${cert}/privkey.pem;
    return 444;
}
NGINX
  ln -sf "${site}" "${link}"
  if nginx -t 2>/tmp/default-host.log; then
    systemctl reload nginx
    echo "Готово: неизвестные адреса больше не открывают сайты этого сервера."
  else
    rm -f "${site}" "${link}"
    cat /tmp/default-host.log
    echo "nginx не принял заглушку, она удалена, сайты работают как раньше. Пришлите вывод выше." >&2
    exit 1
  fi
}
main "$@" </dev/null
