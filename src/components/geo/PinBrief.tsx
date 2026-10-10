"use client";

import { useId, useState } from "react";
import { TELEGRAM } from "@/content/contacts";
import type { GEO } from "@/content/geo";
import { maskPhone, phoneBlur, phoneFocus, phoneOk, submitLead, type LeadResult } from "@/lib/lead";
import styles from "./PinBrief.module.css";

type Data = (typeof GEO)["brief"];

const DOT = ["#fc3f1d", "#19aa1e", "#ffcc00"];

/**
 * Бриф карт: человек пишет название и город, и на схему города справа падает его пин
 * с подписью. Отмеченные площадки появляются цветными точками на подписи пина.
 * После отправки пин подпрыгивает, а от синей точки к нему прорисовывается маршрут.
 */
export default function PinBrief({ data, service }: { data: Data; service: string }) {
  const id = useId();
  const f = data.fields;
  const [biz, setBiz] = useState("");
  const [city, setCity] = useState("");
  const [where, setWhere] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<LeadResult | null>(null);
  const error = touched && !phoneOk(phone) ? "Проверьте номер: нужно 10 цифр после +7" : null;
  const dropped = biz.trim().length > 0;

  const toggle = (p: string) =>
    setWhere((w) => (w.includes(p) ? w.filter((x) => x !== p) : [...w, p]));

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!phoneOk(phone) || busy) return;
    setBusy(true);
    const answers: Record<string, string> = {};
    if (biz.trim()) answers["Бизнес"] = biz.trim();
    if (city.trim()) answers["Город или адрес"] = city.trim();
    if (where.length) answers["Карточка уже есть"] = where.join(", ");
    setSent(
      await submitLead({ source: "service", service, name: name.trim() || undefined, phone, answers }, [
        `Заявка по услуге «${service}»`,
        name.trim() && `Имя: ${name.trim()}`,
        `Телефон: ${phone.trim()}`,
        ...Object.entries(answers).map(([q, a]) => `${q}: ${a}`),
      ]),
    );
    setBusy(false);
  };

  return (
    <section id="brief" className={styles.section} data-surface="dark" aria-labelledby="pinbrief-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="pinbrief-title" className={styles.title}>
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
                {sent.copied ? "Заявка скопирована, отправьте её нам " : "Напишите нам "}
                <a href={TELEGRAM.href} target="_blank" rel="noopener noreferrer">
                  в Telegram
                </a>
                , и Максим перезвонит.
              </p>
            )}
          </div>
        ) : (
          <form className={styles.form} onSubmit={send} noValidate>
            <div className={styles.pair}>
              {(
                [
                  ["biz", f.name, biz, setBiz],
                  ["city", f.city, city, setCity],
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
                    maxLength={60}
                    placeholder={fld.placeholder}
                    onChange={(e) => set(e.target.value)}
                  />
                </div>
              ))}
            </div>

            <fieldset className={styles.where}>
              <legend className={styles.label}>{data.whereLabel}</legend>
              <div className={styles.pills}>
                {data.where.map((p, i) => (
                  <button
                    key={p}
                    type="button"
                    className={styles.pill}
                    aria-pressed={where.includes(p)}
                    onClick={() => toggle(p)}
                    style={{ "--c": DOT[i] ?? "transparent" } as React.CSSProperties}
                  >
                    {DOT[i] ? <span className={styles.pillDot} aria-hidden="true" /> : null}
                    {p}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className={styles.pair}>
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

        <figure className={styles.map} aria-hidden="true" data-sent={sent ? "" : undefined}>
          <svg className={styles.streets} viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice">
            <g stroke="#2b2b30" strokeLinecap="round" fill="none">
              <path d="M0 80 H400 M0 180 H400 M0 290 H400 M90 0 V400 M210 0 V400 M320 0 V400" strokeWidth="10" />
              <path d="M0 130 H400 M0 235 H400 M150 0 V400 M265 0 V400" strokeWidth="3" opacity="0.6" />
              <path d="M-10 360 L410 40" strokeWidth="14" />
            </g>
            <path className={styles.route} d="M90 340 V290 H210 V200" fill="none" stroke="var(--lime)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" pathLength={1} />
            <circle cx="90" cy="340" r="7" fill="#3d8bfd" stroke="#fff" strokeWidth="2.5" />
          </svg>
          <span key={dropped ? "in" : "out"} className={styles.pin} data-on={dropped || undefined}>
            <span className={styles.label2}>
              <span className={styles.pinName}>{biz.trim() || data.pinEmpty}</span>
              {city.trim() ? <span className={styles.pinCity}>{city.trim()}</span> : null}
              {where.length ? (
                <span className={styles.pinDots}>
                  {data.where.map((p, i) =>
                    where.includes(p) && DOT[i] ? <span key={p} style={{ background: DOT[i] }} /> : null,
                  )}
                </span>
              ) : null}
            </span>
            <svg viewBox="0 0 32 40" className={styles.pinSvg}>
              <path d="M16 39C7 27 2 21 2 14a14 14 0 1 1 28 0c0 7-5 13-14 25Z" fill="var(--lime)" />
              <circle cx="16" cy="14" r="5" fill="var(--ink-950)" />
            </svg>
          </span>
        </figure>
      </div>
    </section>
  );
}
