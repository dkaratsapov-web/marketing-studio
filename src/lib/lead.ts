import { TELEGRAM } from "@/content/contacts";

/** Номер корректен, если в нём 10 цифр или 11 с ведущей 7/8: +7 900 000-00-00, 8 900…, 900… */
export const phoneOk = (v: string) => {
  const d = v.replace(/\D/g, "");
  return d.length === 10 || (d.length === 11 && /^[78]/.test(d));
};

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
