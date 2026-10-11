"use client";

import { useId, useState } from "react";
import { TELEGRAM } from "@/content/contacts";
import type { AVTO } from "@/content/avtobiznes";
import { maskPhone, phoneBlur, phoneFocus, phoneOk, submitLead, type LeadResult } from "@/lib/lead";
import styles from "./TestDriveBrief.module.css";

type Data = (typeof AVTO)["brief"];

/**
 * Бриф как запись на тест-драйв. Человек отмечает, что продаёт и где, справа заполняется
 * талон с перфорацией. После отправки талон компостируется: пробиваются отверстия,
 * и он сдвигается, как оторванный.
 */
export default function TestDriveBrief({ data, service }: { data: Data; service: string }) {
  const id = useId();
  const [kind, setKind] = useState(data.kinds[0]);
  const [where, setWhere] = useState<string[]>([data.wheres[0]]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<LeadResult | null>(null);
  const error = touched && !phoneOk(phone) ? "Проверьте номер: нужно 10 цифр после +7" : null;

  const toggle = (w: string) => setWhere((p) => (p.includes(w) ? p.filter((x) => x !== w) : [...p, w]));

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!phoneOk(phone) || busy) return;
    setBusy(true);
    const answers: Record<string, string> = { "Что продаёт": kind };
    if (where.length) answers["Где продаёт"] = where.join(", ");
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
    <section id="brief" className={styles.section} data-surface="dark" aria-labelledby="td-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="td-title" className={styles.title}>
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
              <legend className={styles.label}>{data.kindLabel}</legend>
              <div className={styles.chips}>
                {data.kinds.map((k) => (
                  <label key={k} className={styles.chip}>
                    <input type="radio" name={`${id}-kind`} checked={kind === k} onChange={() => setKind(k)} />
                    <span>{k}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className={styles.set}>
              <legend className={styles.label}>{data.whereLabel}</legend>
              <div className={styles.chips}>
                {data.wheres.map((w) => (
                  <label key={w} className={styles.chip}>
                    <input type="checkbox" checked={where.includes(w)} onChange={() => toggle(w)} />
                    <span>{w}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className={styles.pair}>
              <div className={styles.field}>
                <label htmlFor={`${id}-name`} className={styles.label}>
                  {data.fields.name}
                </label>
                <input id={`${id}-name`} className={styles.input} autoComplete="name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className={styles.field} data-invalid={Boolean(error) || undefined}>
                <label htmlFor={`${id}-phone`} className={styles.label}>
                  {data.fields.phone}
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

        {/* Талон: заполняется вместе с формой, после отправки компостируется */}
        <div className={styles.ticket} data-punched={sent ? "" : undefined} aria-hidden="true">
          <div className={styles.stub}>
            <span>{data.ticket}</span>
            <b>Тест-драйв</b>
          </div>
          <div className={styles.body}>
            <p className={styles.tRow}>
              <span>Клиент</span>
              <b data-empty={!name.trim() || undefined}>{name.trim() || "Ваше имя"}</b>
            </p>
            <p className={styles.tRow}>
              <span>Продаёт</span>
              <b>{kind}</b>
            </p>
            <p className={styles.tRow}>
              <span>Каналы</span>
              <b>{where.length ? where.join(", ") : "—"}</b>
            </p>
            <p className={styles.tRow}>
              <span>Инструктор</span>
              <b>Максим, затем Даниил</b>
            </p>
          </div>
          <span className={styles.holes}>
            <i />
            <i />
            <i />
          </span>
        </div>
      </div>
    </section>
  );
}
