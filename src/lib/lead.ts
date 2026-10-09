const PREFIX = "+7 ";

/** Десять цифр номера после +7 из того, что ввёл или вставил человек */
function localDigits(raw: string) {
  // Префикс +7 уже в поле: его семёрка не часть номера
  const body = raw.startsWith("+7") ? raw.slice(2) : raw;
  let d = body.replace(/\D/g, "");
  // Вставили номер целиком (8 900… или +7 900…), в том числе поверх уже стоящего +7
  if (d.length === 11 && /^[78]/.test(d)) d = d.slice(1);
  return d.slice(0, 10);
}

function format(d: string) {
  if (!d) return PREFIX;
  let out = `${PREFIX}(${d.slice(0, 3)}`;
  if (d.length > 3) out += `) ${d.slice(3, 6)}`;
  if (d.length > 6) out += `-${d.slice(6, 8)}`;
  if (d.length > 8) out += `-${d.slice(8, 10)}`;
  return out;
}

/**
 * Маска телефона: в поле попадают только цифры, номер оформляется как +7 (900) 123-45-67.
 * Если человек стёр скобку или дефис, вместе с ним уходит и последняя цифра, иначе Backspace «застревает».
 */
export function maskPhone(next: string, prev: string) {
  let d = localDigits(next);
  if (next.length < prev.length && d === localDigits(prev)) d = d.slice(0, -1);
  return format(d);
}

/** Номер корректен, если после +7 набраны все десять цифр */
export const phoneOk = (v: string) => localDigits(v).length === 10;

/** Пустое поле при фокусе сразу показывает +7, а если ничего не набрали, при уходе очищается */
export const phoneFocus = (v: string) => v || PREFIX;
export const phoneBlur = (v: string) => (localDigits(v) ? v : "");

export type Lead = {
  /** Какая форма: от этого зависит заголовок сообщения в Telegram */
  source: "hero" | "protocol" | "brief" | "service";
  name?: string;
  phone?: string;
  contact?: string;
  service?: string;
  answers?: Record<string, string>;
};

export type LeadResult =
  | { delivered: true }
  | { delivered: false; text: string; copied: boolean };

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "yclid", "gclid"];
const UTM_STORE = "lead-utm";

/** Метки рекламы из адреса; первые увиденные запоминаются на сессию, чтобы не потеряться при переходах */
function utm(): Record<string, string> {
  const params = new URLSearchParams(window.location.search);
  const fresh = Object.fromEntries(UTM_KEYS.filter((k) => params.get(k)).map((k) => [k, params.get(k) as string]));
  try {
    if (Object.keys(fresh).length) {
      sessionStorage.setItem(UTM_STORE, JSON.stringify(fresh));
      return fresh;
    }
    return JSON.parse(sessionStorage.getItem(UTM_STORE) ?? "{}");
  } catch {
    return fresh;
  }
}

/** Запоминает метки сразу при заходе на сайт, до первой формы */
export function rememberUtm() {
  utm();
}

/**
 * Запасной путь, если сервер заявок недоступен (например, на тестовой копии сайта):
 * текст заявки копируется в буфер, а форма показывает кнопку Telegram.
 */
async function fallback(lines: (string | null | false | undefined)[]) {
  const text = lines.filter(Boolean).join("\n");
  let copied = false;
  try {
    await navigator.clipboard.writeText(text);
    copied = true;
  } catch {
    copied = false;
  }
  return { delivered: false as const, text, copied };
}

/** Отправляет заявку на сервер (бот перешлёт её в Telegram); при сбое уходит в запасной путь */
export async function submitLead(lead: Lead, fallbackLines: (string | null | false | undefined)[]): Promise<LeadResult> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch("/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...lead,
        utm: utm(),
        referrer: document.referrer,
        page: window.location.href,
      }),
      signal: ctrl.signal,
    });
    if (res.ok) return { delivered: true };
  } catch {
    // сеть или таймаут: ниже запасной путь
  } finally {
    window.clearTimeout(timer);
  }
  return fallback(fallbackLines);
}
