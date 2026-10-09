"use client";

import { useId, useState } from "react";
import { maskPhone, phoneBlur, phoneFocus, phoneOk, sendLead } from "@/lib/lead";
import styles from "./QuickLead.module.css";

/**
 * Короткая заявка «Шаг 00» в шапке «Протокола»: имя и телефон.
 * Сервера нет, поэтому заявка, как и бриф, собирается в текст,
 * копируется и открывается Telegram. С ботом send() станет POST-запросом.
 */
export default function QuickLead() {
  const id = useId();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [touched, setTouched] = useState(false);
  const [sent, setSent] = useState<null | { text: string; copied: boolean }>(null);

  const phoneError =
    touched && !phoneOk(phone) ? "Проверьте номер: нужно 10 цифр после +7" : null;
  const consentError = touched && !consent ? "Нужно согласие, иначе не сможем позвонить" : null;

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!phoneOk(phone) || !consent) return;
    const res = await sendLead([
      "Заявка с сайта Корпорации",
      name.trim() && `Имя: ${name.trim()}`,
      `Телефон: ${phone.trim()}`,
    ]);
    setSent(res);
  };

  if (sent) {
    return (
      <div className={styles.lead} role="status" aria-live="polite">
        <p className={styles.kicker}>
          <span className={styles.num}>00</span> Заявка готова
        </p>
        <p className={styles.doneText}>
          {sent.copied
            ? "Текст скопирован. Вставьте его в чат Telegram, который открылся в новой вкладке, и Максим перезвонит."
            : "Отправьте этот текст в Telegram или позвоните нам:"}
        </p>
        {sent.copied ? null : <pre className={styles.doneBrief}>{sent.text}</pre>}
        <button type="button" className={styles.again} onClick={() => setSent(null)}>
          Изменить данные
        </button>
      </div>
    );
  }

  return (
    <form className={styles.lead} onSubmit={send} noValidate>
      <p className={styles.kicker}>
        <span className={styles.num}>00</span> Шаг до первого шага
      </p>

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

      <button type="submit" className={`btn btn--primary ${styles.submit}`}>
        Отправить заявку
        <svg className="btn__arrow" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M1 8h13M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      <p className={styles.promise}>Максим перезвонит в течение часа в рабочее время</p>
    </form>
  );
}
