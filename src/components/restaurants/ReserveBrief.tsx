"use client";

import { useId, useState } from "react";
import { TELEGRAM } from "@/content/contacts";
import type { RESTAURANTS } from "@/content/restaurants";
import { maskPhone, phoneBlur, phoneFocus, phoneOk, submitLead, type LeadResult } from "@/lib/lead";
import styles from "./ReserveBrief.module.css";

type Data = (typeof RESTAURANTS)["brief"];

/**
 * Бриф ресторана как бронь столика, только бронируется созвон: день, время, ресторан
 * и телефон. Справа карточка брони собирается из выбранного; после отправки
 * на ней появляется отметка «принято». День и время уходят вместе с заявкой.
 */
export default function ReserveBrief({ data, service }: { data: Data; service: string }) {
  const id = useId();
  const [day, setDay] = useState(0);
  const [time, setTime] = useState(1);
  const [place, setPlace] = useState("");
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
    const answers: Record<string, string> = {
      "Когда позвонить": `${data.days[day]}, ${data.times[time]}`,
    };
    if (place.trim()) answers["Ресторан"] = place.trim();
    setSent(
      await submitLead({ source: "service", service, phone, answers }, [
        `Заявка: ${service}`,
        `Телефон: ${phone.trim()}`,
        ...Object.entries(answers).map(([q, a]) => `${q}: ${a}`),
      ]),
    );
    setBusy(false);
  };

  return (
    <section id="brief" className={styles.section} data-surface="dark" aria-labelledby="reserve-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="reserve-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        {sent && !sent.delivered ? (
          <div className={styles.done} role="status" aria-live="polite">
            <p>
              Не получилось отправить автоматически.{" "}
              {sent.copied ? "Заявка скопирована, отправьте её нам " : "Напишите нам "}
              <a href={TELEGRAM.href} target="_blank" rel="noopener noreferrer">
                в Telegram
              </a>
              , и Максим перезвонит.
            </p>
          </div>
        ) : sent ? (
          <div className={styles.done} role="status" aria-live="polite">
            <p>{data.done}</p>
          </div>
        ) : (
          <form className={styles.form} onSubmit={send} noValidate>
            <fieldset className={styles.set}>
              <legend className={styles.label}>{data.dayLabel}</legend>
              <div className={styles.days}>
                {data.days.map((d, i) => (
                  <button key={d} type="button" className={styles.chip} aria-pressed={day === i} onClick={() => setDay(i)}>
                    {d}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className={styles.set}>
              <legend className={styles.label}>{data.timeLabel}</legend>
              <div className={styles.times}>
                {data.times.map((t, i) => (
                  <button key={t} type="button" className={styles.slot} aria-pressed={time === i} onClick={() => setTime(i)}>
                    {t}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className={styles.pair}>
              <div className={styles.field}>
                <label htmlFor={`${id}-place`} className={styles.label}>
                  {data.fields.name.label}
                </label>
                <input id={`${id}-place`} className={styles.input} value={place} maxLength={60} placeholder={data.fields.name.placeholder} onChange={(e) => setPlace(e.target.value)} />
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

        {/* Карточка брони: собирается из выбранного */}
        <figure className={styles.ticket} data-sent={sent?.delivered ? "" : undefined} aria-hidden="true">
          <span className={styles.ticketHead}>{data.ticket}</span>
          <span key={`d${day}`} className={styles.big}>
            {data.days[day]}
          </span>
          <span key={`t${time}`} className={styles.time}>
            {data.times[time]}
          </span>
          <span className={styles.place}>{place.trim() || data.fields.name.placeholder}</span>
          <span className={styles.perf} />
          <span className={styles.who}>Звонит Максим · Корпорация</span>
          <span className={styles.ok}>Принято</span>
        </figure>
      </div>
    </section>
  );
}
