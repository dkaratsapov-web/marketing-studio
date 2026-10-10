"use client";

import { useId, useState } from "react";
import { TELEGRAM } from "@/content/contacts";
import type { ANALYTICS } from "@/content/analytics";
import { maskPhone, phoneBlur, phoneFocus, phoneOk, submitLead, type LeadResult } from "@/lib/lead";
import styles from "./DiagnosticBrief.module.css";

type Data = (typeof ANALYTICS)["brief"];

/**
 * Бриф аналитики как диагностика: человек отмечает, что у него уже есть, и справа
 * цепочка от рекламы до продажи показывает, какие звенья считаются, а где разрыв.
 * Счётчик разрывов наверху меняется сразу. Отметки уходят вместе с заявкой.
 */
export default function DiagnosticBrief({ data, service }: { data: Data; service: string }) {
  const id = useId();
  const [has, setHas] = useState<number[]>([0]);
  const [site, setSite] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<LeadResult | null>(null);
  const error = touched && !phoneOk(phone) ? "Проверьте номер: нужно 10 цифр после +7" : null;
  const gaps = data.checks.length - has.length;

  const toggle = (i: number) => setHas((h) => (h.includes(i) ? h.filter((x) => x !== i) : [...h, i]));

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!phoneOk(phone) || busy) return;
    setBusy(true);
    const answers: Record<string, string> = {};
    if (site.trim()) answers["Сайт"] = site.trim();
    answers["Уже есть"] = has.length ? has.map((i) => data.checks[i].name).join(", ") : "ничего из списка";
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
    <section id="brief" className={styles.section} data-surface="dark" aria-labelledby="diag-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="diag-title" className={styles.title}>
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
            <fieldset className={styles.set}>
              <legend className={styles.label}>{data.checksLabel}</legend>
              <div className={styles.checks}>
                {data.checks.map((c, i) => (
                  <button key={c.name} type="button" className={styles.check} aria-pressed={has.includes(i)} onClick={() => toggle(i)}>
                    <span className={styles.box} aria-hidden="true" />
                    {c.name}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className={styles.field}>
              <label htmlFor={`${id}-site`} className={styles.label}>
                {data.site.label}
              </label>
              <input id={`${id}-site`} className={styles.input} inputMode="url" autoComplete="url" value={site} maxLength={80} placeholder={data.site.placeholder} onChange={(e) => setSite(e.target.value)} />
            </div>

            <div className={styles.pair}>
              <div className={styles.field}>
                <label htmlFor={`${id}-name`} className={styles.label}>
                  {data.contact.name}
                </label>
                <input id={`${id}-name`} className={styles.input} autoComplete="name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
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

        {/* Диагностика: цепочка звеньев, разрывы помечены */}
        <figure className={styles.diag} aria-live="polite">
          <p className={styles.summary}>
            <span key={gaps} className={styles.gapNum} data-zero={gaps === 0 || undefined}>
              {gaps}
            </span>
            <span className={styles.gapLabel}>{data.summary}</span>
          </p>
          <ol className={styles.chain}>
            {data.checks.map((c, i) => {
              const ok = has.includes(i);
              return (
                <li key={c.name} className={styles.link} data-ok={ok || undefined}>
                  <span className={styles.node} aria-hidden="true" />
                  <span className={styles.linkBody}>
                    <span className={styles.linkName}>{c.name}</span>
                    <span className={styles.status}>{ok ? data.ok : `${data.bad}: ${c.miss.toLowerCase()}`}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </figure>
      </div>
    </section>
  );
}
