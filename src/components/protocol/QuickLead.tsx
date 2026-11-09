"use client";

import { useId, useState } from "react";
import { TELEGRAM } from "@/content/contacts";
import { maskPhone, phoneBlur, phoneFocus, phoneOk, submitLead, type LeadResult } from "@/lib/lead";
import styles from "./QuickLead.module.css";

type Props = {
  /** Форма для кабинета: «Протокол» на главной или запись на аудит с кнопки на телефоне */
  source?: "protocol" | "audit";
  /** Без верхней линии и отступа: внутри окна */
  bare?: boolean;
};

/**
 * Короткая заявка: имя и телефон. «Шаг 00» в шапке «Протокола» и окно «Записаться на аудит».
 * Уходит на сервер, бот пересылает её в Telegram; если сервер недоступен, текст копируется.
 */
export default function QuickLead({ source = "protocol", bare = false }: Props) {
  const audit = source === "audit";
  const box = bare ? `${styles.lead} ${styles.bare}` : styles.lead;
  const id = useId();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<LeadResult | null>(null);

  const phoneError =
    touched && !phoneOk(phone) ? "Проверьте номер: нужно 10 цифр после +7" : null;
  const consentError = touched && !consent ? "Нужно согласие, иначе не сможем позвонить" : null;

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!phoneOk(phone) || !consent || busy) return;
    setBusy(true);
    const res = await submitLead({ source, name: name.trim(), phone }, [
      audit ? "Запись на аудит с сайта Корпорации" : "Заявка с сайта Корпорации",
      name.trim() && `Имя: ${name.trim()}`,
      `Телефон: ${phone.trim()}`,
    ]);
    setBusy(false);
    setSent(res);
  };

  if (sent?.delivered) {
    return (
      <div className={box} role="status" aria-live="polite">
        <p className={styles.kicker}>
          <span className={styles.num}>01</span> Заявка у нас
        </p>
        <p className={styles.doneText}>
          {audit
            ? "Перезвоним в течение часа в рабочее время и договоримся о времени аудита."
            : "Перезвоним в течение часа в рабочее время. Это и есть первый шаг протокола."}
        </p>
      </div>
    );
  }

  if (sent) {
    return (
      <div className={box} role="status" aria-live="polite">
        <p className={styles.kicker}>
          <span className={styles.num}>00</span> Почти готово
        </p>
        <p className={styles.doneText}>
          Не получилось отправить автоматически.{" "}
          {sent.copied ? "Текст заявки скопирован, вставьте его в чат." : "Отправьте этот текст в чат:"}
        </p>
        {sent.copied ? null : <pre className={styles.doneBrief}>{sent.text}</pre>}
        <a href={TELEGRAM.href} target="_blank" rel="noopener noreferrer" className={`btn btn--primary ${styles.submit}`}>
          Открыть Telegram
        </a>
        <button type="button" className={styles.again} onClick={() => setSent(null)}>
          Изменить данные
        </button>
      </div>
    );
  }

  return (
    <form className={box} onSubmit={send} noValidate>
      {audit ? null : (
        <p className={styles.kicker}>
          <span className={styles.num}>00</span> Шаг до первого шага
        </p>
      )}

      <div className={styles.fields}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Имя</span>
          <input
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Как обращаться"
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Телефон</span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone((prev) => maskPhone(e.target.value, prev))}
            onFocus={() => setPhone(phoneFocus)}
            onBlur={() => setPhone(phoneBlur)}
            placeholder="+7 (900) 000-00-00"
            aria-invalid={Boolean(phoneError)}
            aria-describedby={`${id}-phone`}
          />
        </label>
      </div>
      <span id={`${id}-phone`} className={styles.error}>
        {phoneError}
      </span>

      <label className={styles.consent}>
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          aria-describedby={`${id}-consent`}
        />
        <span>Согласен на обработку персональных данных для ответа на заявку</span>
      </label>
      <span id={`${id}-consent`} className={styles.error}>
        {consentError}
      </span>

      <button type="submit" className={`btn btn--primary ${styles.submit}`} disabled={busy}>
        {busy ? "Отправляем…" : audit ? "Записаться на аудит" : "Отправить заявку"}
        <svg className="btn__arrow" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M1 8h13M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      <p className={styles.promise}>Перезвоним в течение часа в рабочее время</p>
    </form>
  );
}
