"use client";

import { useId, useState } from "react";
import { TELEGRAM } from "@/content/contacts";
import { maskPhone, phoneBlur, phoneFocus, phoneOk, submitLead, type LeadResult } from "@/lib/lead";
import styles from "./HeroLead.module.css";

type Props = {
  /** Откуда заявка: главная или страница услуги (тогда в Telegram придёт и название услуги) */
  source?: "hero" | "service";
  service?: string;
};

/** Открытая форма в первом экране: только телефон и кнопка консультации */
export default function HeroLead({ source = "hero", service }: Props) {
  const id = useId();
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
    setSent(
      await submitLead({ source, service, phone }, [
        service ? `Консультация по услуге «${service}»` : "Консультация с сайта Корпорации",
        `Телефон: ${phone.trim()}`,
      ]),
    );
    setBusy(false);
  };

  if (sent) {
    return (
      <div className={styles.done} role="status" aria-live="polite">
        <span className={styles.doneMark} aria-hidden="true" />
        {sent.delivered ? (
          <p>Заявка у нас. Максим перезвонит на {phone} в течение часа в рабочее время.</p>
        ) : (
          <p>
            Не получилось отправить автоматически.{" "}
            {sent.copied ? "Номер скопирован, отправьте его нам " : `Отправьте номер ${phone} нам `}
            <a href={TELEGRAM.href} target="_blank" rel="noopener noreferrer" className={styles.link}>
              в Telegram
            </a>
            , и Максим перезвонит.
          </p>
        )}
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={send} noValidate>
      <div className={styles.row} data-invalid={Boolean(error) || undefined}>
        <label htmlFor={`${id}-phone`} className="visually-hidden">
          Телефон
        </label>
        <input
          id={`${id}-phone`}
          className={styles.input}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone((prev) => maskPhone(e.target.value, prev))}
            onFocus={() => setPhone(phoneFocus)}
            onBlur={() => setPhone(phoneBlur)}
          placeholder="+7 (900) 000-00-00"
          aria-invalid={Boolean(error)}
          aria-describedby={`${id}-note`}
        />
        <button type="submit" className={`btn btn--primary ${styles.submit}`} disabled={busy}>
          {busy ? "Отправляем…" : "Получить консультацию"}
          <svg className="btn__arrow" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M1 8h13M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      </div>
      <p id={`${id}-note`} className={styles.note} data-error={Boolean(error) || undefined}>
        {error ?? "Нажимая кнопку, вы соглашаетесь на обработку персональных данных"}
      </p>
    </form>
  );
}
