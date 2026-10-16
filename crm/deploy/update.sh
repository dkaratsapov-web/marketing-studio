#!/usr/bin/env bash
# Старый установщик «Ассистента» Сороки отключён: он писал общие с Сорокой файлы
# (/etc/nginx/sites-available/kvalificator.conf, /etc/cron.d/kvalificator-backup).
# Кабинет Корпорации ставится и обновляется только своими скриптами из корня репозитория.
echo "Этот скрипт отключён. Кабинет Корпорации:" >&2
echo "  установка:  deploy/setup-crm.sh (в корне репозитория marketing-studio)" >&2
echo "  обновление: /usr/local/sbin/korp-cabinet-update main (или само при деплое сайта)" >&2
exit 1
