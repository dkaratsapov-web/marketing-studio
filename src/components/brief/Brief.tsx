"use client";

import { useState } from "react";
import { QUIZ } from "@/content/offer";
import { PHONES, TELEGRAM } from "@/content/contacts";
import styles from "./Brief.module.css";

type Answers = Record<string, string>;

const CONTACT_RE = /^(@[A-Za-z0-9_]{4,32}|\+?[\d\s()-]{10,18})$/;

/**
 * Бриф-квиз. Сайт статический, сервера нет: в конце бриф собирается в текст,
 * копируется в буфер и открывается Telegram. Когда появится бэкенд (бот),
 * достаточно заменить send() на POST.
 */
export default function Brief() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [consent, setConsent] = useState(false);
  const [touched, setTouched] = useState(false);
  const [sent, setSent] = useState<null | { text: string; copied: boolean }>(
    null,
  );

  const total = QUIZ.length + 1;
  const isContactStep = step === QUIZ.length;
  const contactError =
    contact.trim() && !CONTACT_RE.test(contact.trim())
      ? "Укажите телефон или ник в Telegram, например +7 900 000-00-00 или @ivan"
      : null;
  const consentError =
    touched && !consent ? "Нужно согласие, иначе мы не сможем ответить" : null;
  const lowBudget = answers.budget === QUIZ[3].options[0];

  const choose = (id: string, value: string) => {
    setAnswers((a) => ({ ...a, [id]: value }));
    setStep((s) => Math.min(s + 1, QUIZ.length));
  };

  const buildText = () =>
    [
      "Бриф с сайта Корпорации",
      ...QUIZ.map((q) => `${q.question}: ${answers[q.id] ?? "не указано"}`),
      name.trim() ? `Имя: ${name.trim()}` : null,
      contact.trim() ? `Связаться: ${contact.trim()}` : null,
    ]
      .filter(Boolean)
      .join("\n");

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!consent || contactError) return;
    const text = buildText();
    let copied = false;
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      copied = false;
    }
    window.open(TELEGRAM.href, "_blank", "noopener,noreferrer");
    setSent({ text, copied });
  };

  return (
    <section id="brief" className={styles.brief} data-surface="dark">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <p className="label">Дело 023</p>
          <h2 className={styles.heading}>Отправить бриф</h2>
          <p className={styles.lead}>
            Четыре вопроса и контакт. Займёт меньше минуты, а на созвоне не
            придётся объяснять всё с нуля.
          </p>
          <div className={styles.direct}>
            <p className="label">Или напрямую</p>
            {PHONES.map((p) => (
              <a key={p.href} href={p.href} className={styles.directLink}>
                {p.display}
              </a>
            ))}
            <a
              href={TELEGRAM.href}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.directLink}
            >
              Telegram {TELEGRAM.handle}
            </a>
          </div>
        </header>

        <div className={styles.panel}>
          {sent ? (
            <div className={styles.done} role="status" aria-live="polite">
              <p className={styles.doneTitle}>Бриф готов</p>
              <p className={styles.doneText}>
                {sent.copied
                  ? "Текст скопирован. Вставьте его в чат Telegram, который открылся в новой вкладке."
                  : "Скопируйте текст ниже и отправьте его в Telegram или позвоните нам."}
              </p>
              <pre className={styles.doneBrief}>{sent.text}</pre>
              <div className={styles.doneActions}>
                <a
                  href={TELEGRAM.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn--primary"
                >
                  Открыть Telegram
                </a>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setSent(null)}
                >
                  Изменить ответы
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={send} noValidate>
              <div className={styles.progress} aria-hidden="true">
                <span style={{ transform: `scaleX(${(step + 1) / total})` }} />
              </div>
              <p className={`label ${styles.counter}`}>
                Шаг {step + 1} из {total}
              </p>

              {!isContactStep ? (
                <fieldset key={QUIZ[step].id} className={styles.step}>
                  <legend className={styles.question}>
                    {QUIZ[step].question}
                  </legend>
                  <div className={styles.options}>
                    {QUIZ[step].options.map((o) => (
                      <button
                        key={o}
                        type="button"
                        className={styles.option}
                        aria-pressed={answers[QUIZ[step].id] === o}
                        onClick={() => choose(QUIZ[step].id, o)}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </fieldset>
              ) : (
                <fieldset className={styles.step}>
                  <legend className={styles.question}>Куда ответить?</legend>
                  {lowBudget ? (
                    <p className={styles.note}>
                      С бюджетом до 50 000 ₽ начнём с карт и Яндекс Бизнеса: там
                      заявки дешевле, а данных для старта хватает.
                    </p>
                  ) : null}
                  <div className={styles.fields}>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>
                        Как к вам обращаться
                      </span>
                      <input
                        id="brief-name"
                        type="text"
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Необязательно"
                      />
                    </label>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>
                        Телефон или Telegram
                      </span>
                      <input
                        id="brief-contact"
                        type="text"
                        inputMode="text"
                        autoComplete="tel"
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        placeholder="+7 900 000-00-00 или @ivan"
                        aria-invalid={Boolean(contactError)}
                        aria-describedby="brief-contact-error"
                      />
                      <span id="brief-contact-error" className={styles.error}>
                        {contactError}
                      </span>
                    </label>
                  </div>
                  <label className={styles.consent}>
                    <input
                      id="brief-consent"
                      type="checkbox"
                      checked={consent}
                      aria-describedby="brief-consent-error"
                      onChange={(e) => setConsent(e.target.checked)}
                    />
                    <span>
                      Согласен на обработку персональных данных для ответа на
                      заявку
                    </span>
                  </label>
                  <span id="brief-consent-error" className={styles.error}>
                    {consentError}
                  </span>
                  <div className={styles.submitRow}>
                    <button type="submit" className="btn btn--primary">
                      Отправить бриф в Telegram
                    </button>
                    <p className={styles.promise}>
                      Ответим в течение часа в рабочее время
                    </p>
                  </div>
                </fieldset>
              )}

              {step > 0 ? (
                <button
                  type="button"
                  className={styles.back}
                  onClick={() => setStep(step - 1)}
                >
                  Назад
                </button>
              ) : null}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
