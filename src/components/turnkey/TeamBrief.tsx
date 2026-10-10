"use client";

import { useId, useState } from "react";
import { TELEGRAM } from "@/content/contacts";
import type { TURNKEY } from "@/content/turnkey";
import { maskPhone, phoneBlur, phoneFocus, phoneOk, submitLead, type LeadResult } from "@/lib/lead";
import styles from "./TeamBrief.module.css";

type Data = (typeof TURNKEY)["brief"];

/**
 * Бриф под ключ: человек отмечает нужные каналы, и справа загораются люди, которые
 * будут их вести, с перечнем их каналов. Максим в команде всегда: договор и связь.
 * Выбранные каналы уходят вместе с заявкой.
 */
export default function TeamBrief({ data, service }: { data: Data; service: string }) {
  const id = useId();
  const [picked, setPicked] = useState<number[]>([0, 1, 2]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<LeadResult | null>(null);
  const error = touched && !phoneOk(phone) ? "Проверьте номер: нужно 10 цифр после +7" : null;
  const MANAGER = data.people.length - 1;

  const toggle = (i: number) => setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));
  const leads = (who: number) => data.channels.filter((c, i) => c.who === who && picked.includes(i)).map((c) => c.name);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!phoneOk(phone) || busy) return;
    setBusy(true);
    const answers: Record<string, string> = {};
    if (picked.length) answers["Каналы"] = picked.map((i) => data.channels[i].name).join(", ");
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
    <section id="brief" className={styles.section} data-surface="light" aria-labelledby="team-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="team-title" className={styles.title}>
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
              <legend className={styles.label}>{data.channelsLabel}</legend>
              <div className={styles.channels}>
                {data.channels.map((c, i) => (
                  <button key={c.name} type="button" className={styles.channel} aria-pressed={picked.includes(i)} onClick={() => toggle(i)}>
                    <span className={styles.toggle} aria-hidden="true" />
                    {c.name}
                  </button>
                ))}
              </div>
            </fieldset>

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

        <ul className={styles.team} aria-live="polite">
          {data.people.map((p, k) => {
            const list = leads(k);
            const on = k === MANAGER || list.length > 0;
            return (
              <li key={p.name} className={styles.person} data-on={on || undefined}>
                <span className={styles.ava} aria-hidden="true">
                  {p.initial}
                </span>
                <span className={styles.who}>
                  <span className={styles.pName}>{p.name}</span>
                  <span className={styles.pRole}>{p.role}</span>
                  <span className={styles.pLeads}>{k === MANAGER ? data.always : list.length ? list.join(", ") : "не нужен в этой команде"}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
