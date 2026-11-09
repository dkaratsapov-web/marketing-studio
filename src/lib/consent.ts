/**
 * Выбор посетителя в плашке про cookie. «all» — можно Яндекс Метрику, «necessary» — только то,
 * без чего не работает сайт. Пока выбора нет, Метрика работает, а плашка висит внизу.
 */
export type CookieChoice = "all" | "necessary";

const KEY = "cookie-consent";
const YEAR = 365 * 86400e3;
export const CONSENT_EVENT = "cookie-consent";
export const SETTINGS_EVENT = "cookie-settings";

export function getConsent(): CookieChoice | null {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as { v?: string; t?: number } | null;
    if (!raw || (raw.v !== "all" && raw.v !== "necessary") || !raw.t || Date.now() - raw.t > YEAR) return null;
    return raw.v;
  } catch {
    return null;
  }
}

export function setConsent(v: CookieChoice) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v, t: Date.now() }));
  } catch {
    // приватный режим: выбор действует до закрытия вкладки
  }
  window.dispatchEvent(new CustomEvent<CookieChoice>(CONSENT_EVENT, { detail: v }));
}

/** Метрике можно работать: посетитель не выбрал «Только необходимые» */
export const metrikaAllowed = () => getConsent() !== "necessary";

/** Открыть плашку снова — ссылка «Настройки cookie» в подвале */
export const openCookieSettings = () => window.dispatchEvent(new Event(SETTINGS_EVENT));
