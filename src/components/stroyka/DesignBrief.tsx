"use client";

import { useId, useState } from "react";
import { TELEGRAM } from "@/content/contacts";
import type { STROYKA } from "@/content/stroyka";
import { maskPhone, phoneBlur, phoneFocus, phoneOk, submitLead, type LeadResult } from "@/lib/lead";
import styles from "./DesignBrief.module.css";

type Data = (typeof STROYKA)["brief"];

/**
 * Бриф как задание на проектирование. Слева форма, справа лист задания в рамке чертежа
 * со штампом: он заполняется вместе с формой. После отправки в штампе прорисовывается
 * подпись «принято в работу».
 */
export default function DesignBrief({ data, service }: { data: Data; service: string }) {
  const id = useId();
  const [objects, setObjects] = useState<string[]>([data.objects[0]]);
  const [what, setWhat] = useState(data.services[0]);
  const [region, setRegion] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<LeadResult | null>(null);
  const error = touched && !phoneOk(phone) ? "Проверьте номер: нужно 10 цифр после +7" : null;

  const toggle = (o: string) => setObjects((p) => (p.includes(o) ? p.filter((x) => x !== o) : [...p, o]));

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!phoneOk(phone) || busy) return;
    setBusy(true);
    const answers: Record<string, string> = { "Что продаёт": what };
    if (objects.length) answers["Объекты"] = objects.join(", ");
    if (region.trim()) answers["Регион"] = region.trim();
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
    <section id="brief" className={styles.section} data-surface="dark" aria-labelledby="dbrief-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="dbrief-title" className={styles.title}>
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
              <legend className={styles.label}>{data.objectsLabel}</legend>
              <div className={styles.chips}>
                {data.objects.map((o) => (
                  <label key={o} className={styles.chip}>
                    <input type="checkbox" checked={objects.includes(o)} onChange={() => toggle(o)} />
                    <span>{o}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className={styles.set}>
              <legend className={styles.label}>{data.serviceLabel}</legend>
              <div className={styles.chips}>
                {data.services.map((s) => (
                  <label key={s} className={styles.chip}>
                    <input type="radio" name={`${id}-what`} checked={what === s} onChange={() => setWhat(s)} />
                    <span>{s}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className={styles.triple}>
              <div className={styles.field}>
                <label htmlFor={`${id}-region`} className={styles.label}>
                  {data.region.label}
                </label>
                <input id={`${id}-region`} className={styles.input} value={region} maxLength={60} placeholder={data.region.placeholder} onChange={(e) => setRegion(e.target.value)} />
              </div>
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

        {/* Лист задания в рамке чертежа со штампом */}
        <div className={styles.sheet} aria-hidden="true">
          <p className={styles.sheetTitle}>{data.sheet}</p>
          <dl className={styles.fields}>
            <div>
              <dt>Объекты</dt>
              <dd>{objects.length ? objects.join(", ") : "—"}</dd>
            </div>
            <div>
              <dt>Работы</dt>
              <dd>{what}</dd>
            </div>
            <div>
              <dt>Регион</dt>
              <dd data-empty={!region.trim() || undefined}>{region.trim() || "не указан"}</dd>
            </div>
            <div>
              <dt>Заказчик</dt>
              <dd data-empty={!name.trim() || undefined}>{name.trim() || "ваше имя"}</dd>
            </div>
          </dl>
          <div className={styles.stamp}>
            <span>Корпорация</span>
            <span>Лист 1</span>
            <span className={styles.signCell}>
              {data.accepted}
              <svg viewBox="0 0 160 40" className={styles.sign} data-on={sent ? "" : undefined}>
                <path d="M4 30c12-18 20-24 26-18s-8 20 2 18 16-22 24-20-6 18 4 16 14-14 22-12 0 12 10 10 18-10 26-8 10 6 22 2" pathLength={1} />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
