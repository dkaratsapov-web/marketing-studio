"use client";

import { useState } from "react";
import { QUIZ } from "@/content/offer";
import { TELEGRAM } from "@/content/contacts";
import { submitLead, type LeadResult } from "@/lib/lead";
import styles from "./Brief.module.css";

type Answers = Record<string, string>;
type Props = {
  /** Префикс id полей: форма живёт и на странице, и в поп-апе */
  idPrefix: string;
  /** Услуга, из которой открыли бриф (строка прайса) */
  service?: string;
};

const CONTACT_RE = /^(@[A-Za-z0-9_]{4,32}|\+?[\d\s()-]{10,18})$/;

/**
 * Бриф-квиз. В конце бриф уходит на сервер, и бот пересылает его в Telegram команды.
 * Если сервер недоступен, бриф собирается в текст и копируется для отправки вручную.
 */
export default function BriefForm({ idPrefix, service }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [consent, setConsent] = useState(false);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<LeadResult | null>(null);

  const total = QUIZ.length + 1;
  const isContactStep = step === QUIZ.length;
  const contactError =
    contact.trim() && !CONTACT_RE.test(contact.trim())
      ? "Укажите телефон или ник в Telegram, например +7 900 000-00-00 или @ivan"
      : touched && !contact.trim()
        ? "Оставьте телефон или ник в Telegram, иначе не сможем ответить"
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
      service ? `Услуга: ${service}` : null,
      ...QUIZ.map((q) => `${q.question}: ${answers[q.id] ?? "не указано"}`),
      name.trim() ? `Имя: ${name.trim()}` : null,
      contact.trim() ? `Связаться: ${contact.trim()}` : null,
    ]
      .filter(Boolean)
      .join("\n");

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!consent || !contact.trim() || contactError || busy) return;
    setBusy(true);
    const res = await submitLead(
      {
        source: "brief",
        name: name.trim(),
        contact: contact.trim(),
        service,
        answers: Object.fromEntries(QUIZ.map((q) => [q.question, answers[q.id] ?? "не указано"])),
      },
      buildText().split("\n"),
    );
    setBusy(false);
    setSent(res);
  };

  return (
    <div className={styles.panel}>
      {sent?.delivered ? (
        <div className={styles.done} role="status" aria-live="polite">
          <p className={styles.doneTitle}>Бриф у нас</p>
          <p className={styles.doneText}>
            Максим изучит ответы и свяжется с вами в течение часа в рабочее время. На созвоне не
            придётся объяснять всё с нуля.
          </p>
        </div>
      ) : sent ? (
        <div className={styles.done} role="status" aria-live="polite">
          <p className={styles.doneTitle}>Бриф готов</p>
          <p className={styles.doneText}>
            Не получилось отправить автоматически.{" "}
            {sent.copied
              ? "Текст скопирован, вставьте его в чат Telegram."
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
            <button type="button" className="btn" onClick={() => setSent(null)}>
              Изменить ответы
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={send} noValidate>
          <div className={styles.progress} aria-hidden="true">
            <span style={{ transform: `scaleX(${(step + 1) / total})` }} />
          </div>
          {service ? (
            <p className={styles.service}>
              <span className="label">Услуга</span> {service}
            </p>
          ) : null}
          <p className={`label ${styles.counter}`}>
            Шаг {step + 1} из {total}
          </p>

          {!isContactStep ? (
            <fieldset key={QUIZ[step].id} className={styles.step}>
              <legend className={styles.question}>{QUIZ[step].question}</legend>
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
                    id={`${idPrefix}-name`}
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
                    id={`${idPrefix}-contact`}
                    type="text"
                    inputMode="text"
                    autoComplete="tel"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="Номер или @ник"
                    aria-invalid={Boolean(contactError)}
                    aria-describedby={`${idPrefix}-contact-error`}
                  />
                  <span
                    id={`${idPrefix}-contact-error`}
                    className={styles.error}
                  >
                    {contactError}
                  </span>
                </label>
              </div>
              <label className={styles.consent}>
                <input
                  id={`${idPrefix}-consent`}
                  type="checkbox"
                  checked={consent}
                  aria-describedby={`${idPrefix}-consent-error`}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span>
                  Согласен на обработку персональных данных для ответа на заявку
                </span>
              </label>
              <span id={`${idPrefix}-consent-error`} className={styles.error}>
                {consentError}
              </span>
              <div className={styles.submitRow}>
                <button type="submit" className="btn btn--primary" disabled={busy}>
                  {busy ? "Отправляем…" : "Отправить бриф"}
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
  );
}
