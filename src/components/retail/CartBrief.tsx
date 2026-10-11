"use client";

import { useId, useState } from "react";
import { TELEGRAM } from "@/content/contacts";
import type { RETAIL } from "@/content/retail";
import { maskPhone, phoneBlur, phoneFocus, phoneOk, submitLead, type LeadResult } from "@/lib/lead";
import styles from "./CartBrief.module.css";

type Data = (typeof RETAIL)["brief"];

/**
 * Бриф как корзина магазина: человек кладёт в корзину то, что нужно, корзина справа
 * считает позиции. Состав корзины уходит вместе с телефоном.
 */
export default function CartBrief({ data, service }: { data: Data; service: string }) {
  const id = useId();
  const [cart, setCart] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<LeadResult | null>(null);
  const error = touched && !phoneOk(phone) ? "Проверьте номер: нужно 10 цифр после +7" : null;
  const items = data.picks.filter((p) => cart.includes(p));

  const toggle = (p: string) => setCart((c) => (c.includes(p) ? c.filter((x) => x !== p) : [...c, p]));

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!phoneOk(phone) || busy) return;
    setBusy(true);
    const answers: Record<string, string> = {};
    if (items.length) answers["Корзина"] = items.join(", ");
    setSent(
      await submitLead({ source: "service", service, name: name.trim() || undefined, phone, answers }, [
        `Заявка по решению «${service}»`,
        name.trim() && `Имя: ${name.trim()}`,
        `Телефон: ${phone.trim()}`,
        ...Object.entries(answers).map(([q, a]) => `${q}: ${a}`),
      ]),
    );
    setBusy(false);
  };

  return (
    <section id="brief" className={styles.section} data-surface="dark" aria-labelledby="cart-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="cart-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        {sent ? (
          <div className={styles.done} role="status" aria-live="polite">
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
              <legend className={styles.label}>{data.pickLabel}</legend>
              <ul className={styles.picks}>
                {data.picks.map((p) => {
                  const inCart = cart.includes(p);
                  return (
                    <li key={p}>
                      <button type="button" className={styles.pick} aria-pressed={inCart} onClick={() => toggle(p)}>
                        <span>{p}</span>
                        <span className={styles.add} aria-hidden="true">
                          {inCart ? "В корзине" : "+ В корзину"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </fieldset>

            <div className={styles.cart} aria-live="polite">
              <p className={styles.cartHead}>
                {data.cart}
                <span key={items.length} className={styles.count}>
                  {items.length}
                </span>
              </p>
              {items.length ? (
                <ol className={styles.lines}>
                  {items.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ol>
              ) : (
                <p className={styles.empty}>{data.empty}</p>
              )}

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
      </div>
    </section>
  );
}
