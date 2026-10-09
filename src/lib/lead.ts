import { TELEGRAM } from "@/content/contacts";

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

/**
 * Отправка заявки без сервера: текст копируется в буфер и открывается Telegram.
 * Когда появится бот, здесь будет POST, а формы останутся как есть.
 */
export async function sendLead(lines: (string | null | false)[]) {
  const text = lines.filter(Boolean).join("\n");
  let copied = false;
  try {
    await navigator.clipboard.writeText(text);
    copied = true;
  } catch {
    copied = false;
  }
  window.open(TELEGRAM.href, "_blank", "noopener,noreferrer");
  return { text, copied };
}
