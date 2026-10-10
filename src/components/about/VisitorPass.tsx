"use client";

import { useId, useState } from "react";
import { HOURS, PHONES, TELEGRAM } from "@/content/contacts";
import type { ABOUT } from "@/content/about";
import { maskPhone, phoneBlur, phoneFocus, phoneOk, submitLead, type LeadResult } from "@/lib/lead";
import styles from "./VisitorPass.module.css";

type Data = (typeof ABOUT)["visit"];

/**
 * Финал «О нас»: человек заполняет пропуск посетителя, справа пропуск заполняется
 * вместе с ним (имя, цель визита, этаж). После отправки пропуск прикладывается
 * к считывателю турникета: огонёк меняется с розового на салатовый, планка уходит в сторону.
 */
export default function VisitorPass({ data }: { data: Data }) {
  const id = useId();
  const [purpose, setPurpose] = useState(data.purposes[0]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<LeadResult | null>(null);
  const error = touched && !phoneOk(phone) ? "Проверьте номер: нужно 10 цифр после +7" : null;

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!phoneOk(phone) || busy) return;
    setBusy(true);
    const answers = { "Цель визита": purpose };
    setSent(
      await submitLead({ source: "brief", name: name.trim() || undefined, phone, answers }, [
        "Заявка со страницы «О нас»",
        name.trim() && `Имя: ${name.trim()}`,
        `Телефон: ${phone.trim()}`,
        `Цель визита: ${purpose}`,
      ]),
    );
    setBusy(false);
  };

  return (
    <section id="brief" className={styles.section} data-surface="light" aria-labelledby="visit-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="visit-title" className={styles.title}>
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
              <legend className={styles.label}>{data.purposeLabel}</legend>
              <div className={styles.purposes}>
                {data.purposes.map((p) => (
                  <label key={p} className={styles.purpose}>
                    <input type="radio" name={`${id}-purpose`} value={p} checked={purpose === p} onChange={() => setPurpose(p)} />
                    <span>{p}</span>
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

        <div className={styles.side}>
          <div className={styles.gate} data-open={sent ? "" : undefined} aria-hidden="true">
            <div className={styles.pass}>
              <p className={styles.passTop}>
                <span>Корпорация</span>
                <span>{data.pass}</span>
              </p>
              <dl className={styles.passRows}>
                <div>
                  <dt>{data.guest}</dt>
                  <dd data-empty={!name.trim() || undefined}>{name.trim() || "Ваше имя"}</dd>
                </div>
                <div>
                  <dt>{data.purposeLabel}</dt>
                  <dd>{purpose}</dd>
                </div>
                <div>
                  <dt>{data.floor}</dt>
                  <dd>{data.floorFor[purpose]}</dd>
                </div>
              </dl>
              <span className={styles.chip} />
            </div>
            <div className={styles.reader}>
              <span className={styles.light} />
              <span className={styles.slot} />
            </div>
            <div className={styles.turnstile}>
              <span className={styles.post} />
              <span className={styles.arm} />
            </div>
          </div>

          <div className={styles.contacts}>
            <p className={styles.label}>
              {data.contactsLabel} · {HOURS}
            </p>
            {PHONES.map((p) => (
              <a key={p.href} href={p.href} className={styles.contact}>
                {p.display}
              </a>
            ))}
            <a href={TELEGRAM.href} target="_blank" rel="noopener noreferrer" className={styles.contact}>
              Telegram {TELEGRAM.handle}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
