#!/usr/bin/env python3
"""Приёмник заявок с сайта Корпорации.

Слушает POST /api/lead на 127.0.0.1 (снаружи к нему ходит только nginx), проверяет заявку
и рассылает её по настроенным каналам: письмом (SMTP, например Яндекс Почта) и/или в Telegram.
Каждая заявка дописывается в LEAD_LOG (JSON Lines) как резервная копия: данные хранятся на сервере в России.

Только стандартная библиотека Python, никаких зависимостей.
Настройки (переменные окружения):
  почта:    SMTP_HOST, SMTP_PORT (465), SMTP_USER, SMTP_PASS, MAIL_TO (через запятую)
  Telegram: BOT_TOKEN, CHAT_IDS (через запятую), TG_API (адрес Bot API или ретранслятора), RELAY_KEY
  общее:    LEAD_LOG, PORT
"""
import html
import json
import os
import re
import smtplib
import socket
import ssl
import sys
import threading
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from email.utils import formataddr
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

def _list(name: str) -> list[str]:
    return [v.strip() for v in os.environ.get(name, "").split(",") if v.strip()]


TOKEN = os.environ.get("BOT_TOKEN", "")
CHATS = _list("CHAT_IDS") if TOKEN else []
SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "465"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")
MAIL_TO = _list("MAIL_TO") if SMTP_HOST else []
LOG = os.environ.get("LEAD_LOG", "/var/lib/marketing-studio/leads.jsonl")
PORT = int(os.environ.get("PORT", "8787"))
# Адрес Bot API можно подменить для проверки без настоящего Telegram
TG_API = os.environ.get("TG_API", "https://api.telegram.org").rstrip("/")
# Ключ ретранслятора (deploy/relay/worker.js), если Telegram API недоступен напрямую
RELAY_KEY = os.environ.get("RELAY_KEY", "")
MSK = timezone(timedelta(hours=3))

SOURCES = {
    "hero": "Консультация · первый экран",
    "protocol": "Заявка · блок «Протокол»",
    "brief": "Бриф",
    "test": "Проверка связи",
}
UTM_KEYS = ("utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "yclid", "gclid")

# Только IPv4: у многих VPS IPv6 объявлен, но не работает, и запрос к Telegram висит до таймаута
_getaddrinfo = socket.getaddrinfo


def _ipv4_only(host, port, family=0, *args, **kwargs):
    return _getaddrinfo(host, port, socket.AF_INET, *args, **kwargs)


socket.getaddrinfo = _ipv4_only

# Не больше 5 заявок с одного адреса за 10 минут: защита от ботов и случайных повторов
_hits: dict[str, list[float]] = {}
_lock = threading.Lock()


def limited(ip: str) -> bool:
    now = time.time()
    with _lock:
        recent = [t for t in _hits.get(ip, []) if now - t < 600]
        blocked = len(recent) >= 5
        if not blocked:
            recent.append(now)
        _hits[ip] = recent
        return blocked


def text(value, limit=300) -> str:
    return str(value or "").strip()[:limit]


def phone_ok(value: str) -> bool:
    return len(re.sub(r"\D", "", value)) >= 10


def contact_ok(value: str) -> bool:
    return phone_ok(value) or bool(re.fullmatch(r"@?[A-Za-z0-9_]{4,32}", value))


def tel_text(value: str) -> str:
    """Номер в виде +7XXXXXXXXXX: Telegram сам делает его кликабельным (ссылки tel: он не принимает)."""
    digits = re.sub(r"\D", "", value)
    if len(digits) == 10:
        digits = "7" + digits
    if len(digits) == 11 and digits[0] == "8":
        digits = "7" + digits[1:]
    return f"+{digits}" if len(digits) == 11 else html.escape(value)


def build_message(lead: dict) -> str:
    e = html.escape
    out = [f"<b>{e(SOURCES.get(lead['source'], 'Заявка с сайта'))}</b>", ""]
    if lead["phone"]:
        out.append(f"Телефон: {tel_text(lead['phone'])}")
    if lead["contact"]:
        c = lead["contact"]
        if phone_ok(c):
            out.append(f"Связаться: {tel_text(c)}")
        else:
            handle = c.lstrip("@")
            out.append(f'Telegram: <a href="https://t.me/{e(handle)}">@{e(handle)}</a>')
    if lead["name"]:
        out.append(f"Имя: {e(lead['name'])}")
    if lead["service"]:
        out.append(f"Услуга: {e(lead['service'])}")
    if lead["answers"]:
        out.append("")
        for q, a in lead["answers"].items():
            out.append(f"<b>{e(q)}</b>\n{e(a)}")
    marks = [f"{k}={e(v)}" for k, v in lead["utm"].items()]
    if marks or lead["referrer"]:
        out.append("")
        if marks:
            out.append("Метки: " + ", ".join(marks))
        if lead["referrer"]:
            out.append(f"Пришёл с: {e(lead['referrer'])}")
    out.append("")
    out.append(f"<i>{datetime.now(MSK).strftime('%d.%m.%Y %H:%M')} МСК</i>")
    return "\n".join(out)


def telegram(chat: str, message: str) -> None:
    body = json.dumps(
        {"chat_id": chat, "text": message, "parse_mode": "HTML", "disable_web_page_preview": True}
    ).encode()
    req = urllib.request.Request(
        f"{TG_API}/bot{TOKEN}/sendMessage",
        data=body,
        headers={"Content-Type": "application/json", **({"X-Relay-Key": RELAY_KEY} if RELAY_KEY else {})},
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        if json.load(resp).get("ok") is not True:
            raise RuntimeError("telegram answered not ok")


def mail(lead: dict, message: str) -> None:
    """Письмо с заявкой: тема сразу говорит, что за заявка и как связаться."""
    plain = re.sub(r"<[^>]+>", "", message)
    plain = html.unescape(plain)
    who = lead["phone"] or lead["contact"]
    msg = EmailMessage()
    msg["Subject"] = f"Заявка с сайта: {SOURCES.get(lead['source'], 'заявка')} · {who}"
    msg["From"] = formataddr(("Сайт Корпорации", SMTP_USER))
    msg["To"] = ", ".join(MAIL_TO)
    msg.set_content(plain + "\n\n--\nmarketing-studio.pro\n")
    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=ssl.create_default_context(), timeout=15) as smtp:
        smtp.login(SMTP_USER, SMTP_PASS)
        smtp.send_message(msg)


def normalize(data: dict) -> dict:
    answers = data.get("answers") if isinstance(data.get("answers"), dict) else {}
    utm = data.get("utm") if isinstance(data.get("utm"), dict) else {}
    return {
        "source": text(data.get("source"), 20),
        "name": text(data.get("name"), 80),
        "phone": text(data.get("phone"), 40),
        "contact": text(data.get("contact"), 60),
        "service": text(data.get("service"), 120),
        "answers": {text(k, 120): text(v, 300) for k, v in list(answers.items())[:10]},
        "utm": {k: text(utm[k], 120) for k in UTM_KEYS if utm.get(k)},
        "referrer": text(data.get("referrer"), 200),
        "page": text(data.get("page"), 300),
    }


class Handler(BaseHTTPRequestHandler):
    server_version = "lead-bot"

    def reply(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.rstrip("/") == "/api/lead/health":
            return self.reply(200, {"ok": True})
        self.reply(404, {"ok": False})

    def do_POST(self):
        if self.path.rstrip("/") != "/api/lead":
            return self.reply(404, {"ok": False})
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > 10_000:
            return self.reply(413, {"ok": False, "error": "size"})
        ip = self.headers.get("X-Real-IP") or self.client_address[0]
        try:
            data = json.loads(self.rfile.read(length))
            assert isinstance(data, dict)
        except Exception:
            return self.reply(400, {"ok": False, "error": "json"})

        # Скрытое поле: человек его не видит и не заполняет, бот заполняет. Делаем вид, что всё хорошо
        if data.get("website"):
            return self.reply(200, {"ok": True})
        if limited(ip):
            return self.reply(429, {"ok": False, "error": "rate"})

        lead = normalize(data)
        if lead["source"] not in SOURCES:
            return self.reply(400, {"ok": False, "error": "source"})
        if not (phone_ok(lead["phone"]) or contact_ok(lead["contact"])):
            return self.reply(400, {"ok": False, "error": "contact"})

        message = build_message(lead)
        delivered = 0
        if MAIL_TO:
            try:
                mail(lead, message)
                delivered += 1
            except (smtplib.SMTPException, OSError) as err:
                print(f"mail: {err}", file=sys.stderr, flush=True)
        for chat in CHATS:
            try:
                telegram(chat, message)
                delivered += 1
            except (urllib.error.URLError, RuntimeError, TimeoutError, OSError) as err:
                print(f"telegram {chat}: {err}", file=sys.stderr, flush=True)

        try:
            with open(LOG, "a", encoding="utf-8") as f:
                record = {"at": datetime.now(MSK).isoformat(), "ip": ip, "delivered": delivered, **lead}
                f.write(json.dumps(record, ensure_ascii=False) + "\n")
        except OSError as err:
            print(f"log: {err}", file=sys.stderr, flush=True)

        if delivered == 0:
            return self.reply(502, {"ok": False, "error": "delivery"})
        self.reply(200, {"ok": True})

    def log_message(self, fmt, *args):
        print(f"{self.headers.get('X-Real-IP') or self.client_address[0]} {fmt % args}", file=sys.stderr, flush=True)


if __name__ == "__main__":
    print(f"lead-bot on 127.0.0.1:{PORT}, mail: {len(MAIL_TO)}, telegram chats: {len(CHATS)}", file=sys.stderr, flush=True)
    if not (MAIL_TO or CHATS):
        print("no delivery channels configured", file=sys.stderr, flush=True)
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
