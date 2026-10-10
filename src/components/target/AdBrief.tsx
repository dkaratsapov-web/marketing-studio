"use client";

import { useId, useState } from "react";
import { TELEGRAM } from "@/content/contacts";
import type { TARGET } from "@/content/target";
import { maskPhone, phoneBlur, phoneFocus, phoneOk, submitLead, type LeadResult } from "@/lib/lead";
import { AvitoMark, TelegramMark, VkMark } from "./Marks";
import styles from "./AdBrief.module.css";

type Data = (typeof TARGET)["brief"];

const MARKS = [VkMark, TelegramMark, AvitoMark];

/**
 * Бриф отдела: человек пишет, чем занимается, город и предложение, и справа сразу
 * собирается его объявление в ленте. Площадки выбираются пилюлями, знак первой из выбранных
 * встаёт в угол превью. Ниже имя и телефон: заявка уходит вместе с черновиком объявления.
 */
export default function AdBrief({ data, service }: { data: Data; service: string }) {
  const id = useId();
  const f = data.fields;
  const [biz, setBiz] = useState("");
  const [city, setCity] = useState("");
  const [offer, setOffer] = useState("");
  const [where, setWhere] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<LeadResult | null>(null);
  const error = touched && !phoneOk(phone) ? "Проверьте номер: нужно 10 цифр после +7" : null;

  const firstMark = data.platforms.findIndex((p) => where.includes(p));
  const Mark = firstMark >= 0 && firstMark < MARKS.length ? MARKS[firstMark] : null;
  const shownBiz = biz.trim() || data.preview.empty;
  const shownOffer = offer.trim() || data.preview.offerEmpty;

  const toggle = (p: string) =>
    setWhere((w) => (w.includes(p) ? w.filter((x) => x !== p) : [...w, p]));

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!phoneOk(phone) || busy) return;
    setBusy(true);
    const answers: Record<string, string> = {};
    if (biz.trim()) answers["Бизнес"] = biz.trim();
    if (city.trim()) answers["Город"] = city.trim();
    if (offer.trim()) answers["Предложение"] = offer.trim();
    if (where.length) answers["Площадки"] = where.join(", ");
    setSent(
      await submitLead({ source: "service", service, name: name.trim() || undefined, phone, answers }, [
        `Бриф по услуге «${service}»`,
        name.trim() && `Имя: ${name.trim()}`,
        `Телефон: ${phone.trim()}`,
        ...Object.entries(answers).map(([q, a]) => `${q}: ${a}`),
      ]),
    );
    setBusy(false);
  };

  return (
    <section id="brief" className={styles.section} data-surface="light" aria-labelledby="adbrief-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="adbrief-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        {sent ? (
          <div className={styles.done} role="status" aria-live="polite">
            <span className={styles.doneMark} aria-hidden="true" />
            {sent.delivered ? (
              <p>{data.done}</p>
            ) : (
              <p>
                Не получилось отправить автоматически.{" "}
                {sent.copied ? "Бриф скопирован, отправьте его нам " : "Напишите нам "}
                <a href={TELEGRAM.href} target="_blank" rel="noopener noreferrer">
                  в Telegram
                </a>
                , и Максим перезвонит.
              </p>
            )}
          </div>
        ) : (
          <form className={styles.form} onSubmit={send} noValidate>
            {(
              [
                ["biz", f.business, biz, setBiz],
                ["city", f.city, city, setCity],
                ["offer", f.offer, offer, setOffer],
              ] as const
            ).map(([k, fld, v, set]) => (
              <div key={k} className={styles.field}>
                <label htmlFor={`${id}-${k}`} className={styles.label}>
                  {fld.label}
                </label>
                <input
                  id={`${id}-${k}`}
                  className={styles.input}
                  value={v}
                  maxLength={k === "offer" ? 70 : 40}
                  placeholder={fld.placeholder}
                  onChange={(e) => set(e.target.value)}
                />
              </div>
            ))}

            <fieldset className={styles.where}>
              <legend className={styles.label}>{data.platformsLabel}</legend>
              <div className={styles.pills}>
                {data.platforms.map((p, i) => {
                  const M = MARKS[i];
                  return (
                    <button
                      key={p}
                      type="button"
                      className={styles.pill}
                      aria-pressed={where.includes(p)}
                      onClick={() => toggle(p)}
                    >
                      {M ? <M className={styles.pillMark} /> : null}
                      {p}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className={styles.contacts}>
              <div className={styles.field}>
                <label htmlFor={`${id}-name`} className={styles.label}>
                  {data.contact.name}
                </label>
                <input
                  id={`${id}-name`}
                  className={styles.input}
                  autoComplete="name"
                  value={name}
                  maxLength={40}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className={styles.field} data-invalid={Boolean(error) || undefined}>
                <label htmlFor={`${id}-phone`} className={styles.label}>
                  {data.contact.phone}
                </label>
                <input
                  id={`${id}-phone`}
                  className={styles.input}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  value={phone}
                  placeholder="+7 (900) 000-00-00"
                  onChange={(e) => setPhone((prev) => maskPhone(e.target.value, prev))}
                  onFocus={() => setPhone(phoneFocus)}
                  onBlur={() => setPhone(phoneBlur)}
                  aria-invalid={Boolean(error)}
                  aria-describedby={`${id}-note`}
                />
              </div>
            </div>

            <div className={styles.submitRow}>
              <button type="submit" className={`btn btn--primary ${styles.submit}`} disabled={busy}>
                {busy ? "Отправляем…" : data.submit}
                <svg className="btn__arrow" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M1 8h13M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </button>
              <p id={`${id}-note`} className={styles.note} data-error={Boolean(error) || undefined}>
                {error ?? data.consent}
              </p>
            </div>
          </form>
        )}

        {/* Превью: объявление собирается из того, что человек вводит */}
        <figure className={styles.preview} aria-hidden="true">
          <div className={styles.ad}>
            <span className={styles.adHead}>
              <span className={styles.adAva}>{shownBiz[0]?.toUpperCase()}</span>
              <span className={styles.adWho}>
                <span key={shownBiz} className={styles.pop}>
                  {shownBiz}
                </span>
                <span className={styles.adBadge}>
                  {data.preview.badge}
                  {city.trim() ? ` · ${city.trim()}` : ""}
                </span>
              </span>
              {Mark ? <Mark key={firstMark} className={styles.adMark} /> : null}
            </span>
            <span className={styles.adPhoto}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 7h3l2-2h6l2 2h3v12H4V7Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              Фото ваших работ
            </span>
            <span key={shownOffer} className={`${styles.adTitle} ${styles.pop}`}>
              {shownOffer}
            </span>
            <span className={styles.adCta}>{data.preview.cta}</span>
          </div>
        </figure>
      </div>
    </section>
  );
}
