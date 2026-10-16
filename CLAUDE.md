@AGENTS.md

# Правила проекта

## Сорока и Корпорация полностью разделены и никогда не пересекаются

Это решение владельца обоих проектов. Изменения, которые касаются обоих проектов, не делать вообще.

| | Корпорация (этот репозиторий) | Soroka Marketing (чужой проект) |
|---|---|---|
| Сервер | 194.67.101.183 | VPS Джино 176.98.177.12 |
| Адреса | marketing-studio.pro, crm.marketing-studio.pro | qual.soroka-marketing.ru |
| Папка | /var/www/marketing-studio, /opt/korp-cabinet | /opt/kvalificator на сервере Сороки |
| Контейнер, порт | korp-cabinet-app-1, 127.0.0.1:3101 | — |
| nginx | sites-available/marketing-studio, korp-cabinet.conf, 00-default (заглушка для чужих адресов) | — |
| Бэкап | /etc/cron.d/korp-cabinet-backup | — |
| Репозиторий | dkaratsapov-web/marketing-studio | banifaci13-sketch/kvalificator |

На 194.67.101.183 Сороки больше нет. Папку `/opt/kvalificator.soroka-old` удаляет владелец, её не трогать.
Адрес `soroka-assistant.ru` больше не используется.

Запрещено:
- заходить на сервер Сороки 176.98.177.12 или давать владельцу команды для него;
- использовать адреса `qual.soroka-marketing.ru` и `soroka-assistant.ru`;
- трогать `/opt/kvalificator.soroka-old`, а также любые файлы с именем `kvalificator` в nginx и cron;
- использовать ключи, токены и данные Сороки: Telegram-бота, ключи ИИ, Zoom/Телемост, Яндекс ID, сотрудников,
  клиентов, базу, логотип и бренд Soroka Marketing;
- отправлять что-либо в репозиторий Сороки.

Папка `crm/` выросла из кода «Ассистента» Сороки, но это отдельная копия со своей базой, брендом и ключами.
Кабинет ставится только `deploy/setup-crm.sh` и обновляется только `korp-cabinet-update`;
старые установщики `crm/deploy/install.sh` и `update.sh` отключены, потому что писали общие с Сорокой файлы.

Если на сервере что-то непонятное (чужой контейнер, конфиг, адрес), не трогать и спросить владельца.
Однажды «лишнюю копию» в /opt/kvalificator остановили, и soroka-assistant.ru начал открывать кабинет Корпорации.
