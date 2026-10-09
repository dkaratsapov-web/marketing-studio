"use client";

import { useId, useState } from "react";
import { maskPhone, phoneBlur, phoneFocus, phoneOk, sendLead } from "@/lib/lead";
import styles from "./HeroLead.module.css";

/** Открытая форма в первом экране: только телефон и кнопка консультации */
export default function HeroLead() {
  const id = useId();
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState(false);
  const [sent, setSent] = useState<null | { text: string; copied: boolean }>(null);
  const error = touched && !phoneOk(phone) ? "Проверьте номер: нужно 10 цифр после +7" : null;

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!phoneOk(phone)) return;
    setSent(await sendLead(["Консультация с сайта Корпорации", `Телефон: ${phone.trim()}`]));
  };

  if (sent) {
    return (
      <div className={styles.done} role="status" aria-live="polite">
        <span className={styles.doneMark} aria-hidden="true" />
        <p>
          {sent.copied
            ? "Номер скопирован, Telegram открыт в новой вкладке. Отправьте сообщение, и Максим перезвонит в течение часа."
            : `Отправьте номер ${phone.trim()} в Telegram @Daniil_065, и Максим перезвонит в течение часа.`}
        </p>
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
        <button type="submit" className={`btn btn--primary ${styles.submit}`}>
          Получить консультацию
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
