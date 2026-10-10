"use client";

import { useId, useState } from "react";
import { TELEGRAM } from "@/content/contacts";
import type { WEB } from "@/content/web";
import { maskPhone, phoneBlur, phoneFocus, phoneOk, submitLead, type LeadResult } from "@/lib/lead";
import styles from "./StructureBrief.module.css";

type Data = (typeof WEB)["brief"];

/** Схематичный рисунок каждого блока страницы: у каждого своя раскладка линий */
function Wire({ i }: { i: number }) {
  switch (i) {
    case 0:
      return (
        <span className={styles.w} data-w="hero">
          <span data-l="xl" />
          <span data-l="l" />
          <span data-l="btn" />
          <span data-l="pic" />
        </span>
      );
    case 1:
    case 2:
      return (
        <span className={styles.w} data-w="cards">
          <span />
          <span />
          <span />
        </span>
      );
    case 3:
      return (
        <span className={styles.w} data-w="quotes">
          <span />
          <span />
        </span>
      );
    case 4:
      return (
        <span className={styles.w} data-w="quiz">
          <span />
          <span />
          <span />
          <span />
        </span>
      );
    case 5:
      return (
        <span className={styles.w} data-w="rows">
          <span />
          <span />
          <span />
        </span>
      );
    case 6:
      return (
        <span className={styles.w} data-w="slots">
          {Array.from({ length: 8 }, (_, k) => (
            <span key={k} />
          ))}
        </span>
      );
    default:
      return (
        <span className={styles.w} data-w="form">
          <span />
          <span />
          <span data-l="btn" />
        </span>
      );
  }
}

/**
 * Бриф разработки: человек отмечает блоки будущей страницы, и справа в окне браузера
 * собирается её схема, блок за блоком, в порядке, в каком они пойдут на сайте.
 * Схема и выбранный вид сайта уходят вместе с заявкой.
 */
export default function StructureBrief({ data, service }: { data: Data; service: string }) {
  const id = useId();
  const [picked, setPicked] = useState<number[]>([0, 1, 7]);
  const [kind, setKind] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<LeadResult | null>(null);
  const error = touched && !phoneOk(phone) ? "Проверьте номер: нужно 10 цифр после +7" : null;
  const order = data.blocks.map((_, i) => i).filter((i) => picked.includes(i));

  const toggle = (i: number) => setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!phoneOk(phone) || busy) return;
    setBusy(true);
    const answers: Record<string, string> = {};
    if (kind) answers["Что нужно"] = kind;
    if (order.length) answers["Блоки"] = order.map((i) => data.blocks[i]).join(", ");
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
    <section id="brief" className={styles.section} data-surface="dark" aria-labelledby="structure-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="structure-title" className={styles.title}>
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
              <legend className={styles.label}>{data.blocksLabel}</legend>
              <div className={styles.pills}>
                {data.blocks.map((b, i) => (
                  <button key={b} type="button" className={styles.pill} aria-pressed={picked.includes(i)} onClick={() => toggle(i)}>
                    <span className={styles.check} aria-hidden="true" />
                    {b}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className={styles.set}>
              <legend className={styles.label}>{data.kindLabel}</legend>
              <div className={styles.pills}>
                {data.kinds.map((k) => (
                  <button key={k} type="button" className={styles.pill} aria-pressed={kind === k} onClick={() => setKind(kind === k ? null : k)}>
                    {k}
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

        {/* Схема страницы: блоки встают в окне браузера в порядке страницы */}
        <figure className={styles.preview} aria-hidden="true">
          <span className={styles.bar}>
            <span />
            <span />
            <span />
          </span>
          <span className={styles.page}>
            {order.length === 0 ? <span className={styles.empty}>{data.empty}</span> : null}
            {order.map((i) => (
              <span key={i} className={styles.block}>
                <span className={styles.blockName}>{data.blocks[i]}</span>
                <Wire i={i} />
              </span>
            ))}
          </span>
        </figure>
      </div>
    </section>
  );
}
