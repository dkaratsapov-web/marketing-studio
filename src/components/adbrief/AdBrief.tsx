"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AD_BRIEF, type BriefField } from "@/content/adBrief";
import { PHONES, TELEGRAM } from "@/content/contacts";
import { maskPhone, phoneBlur, phoneFocus, phoneOk } from "@/lib/lead";
import { LogoMark } from "@/components/Logo";
import styles from "./AdBrief.module.css";

/** Кабинет агентства принимает бриф и показывает его в разделе «Брифы» */
const CRM_URL = (process.env.NEXT_PUBLIC_CRM_URL ?? "https://crm.marketing-studio.pro").replace(/\/$/, "");
const DRAFT_KEY = "ad-brief-draft";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Контакты уходят отдельными полями и в кабинете стоят отдельным блоком
const CONTACT_IDS = new Set(["contactName", "phone", "email"]);

type Values = Record<string, string>;
type Multi = Record<string, string[]>;
type Sent = { delivered: true } | { delivered: false; text: string; copied: boolean };

const detailKey = (id: string) => `${id}__detail`;

function answerOf(f: BriefField, values: Values, multi: Multi) {
  const detail = values[detailKey(f.id)]?.trim();
  if (f.kind === "multi") return [...(multi[f.id] ?? []), detail].filter(Boolean).join(", ");
  const v = values[f.id]?.trim() ?? "";
  return v && detail && f.detail?.when === v ? `${v}: ${detail}` : v;
}

const filled = (f: BriefField, values: Values, multi: Multi) => Boolean(answerOf(f, values, multi));

export default function AdBrief() {
  const [values, setValues] = useState<Values>({});
  const [multi, setMulti] = useState<Multi>({});
  const [consent, setConsent] = useState(false);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<Sent | null>(null);
  const [restored, setRestored] = useState(false);

  // Черновик в браузере: длинный бриф можно заполнять в несколько заходов
  useEffect(() => {
    // после первой отрисовки: разметка со статической страницы совпадает с серверной
    const t = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
          const d = JSON.parse(raw) as { values?: Values; multi?: Multi };
          if (d.values) setValues(d.values);
          if (d.multi) setMulti(d.multi);
        }
      } catch {
        // нет доступа к хранилищу: просто без черновика
      }
      setRestored(true);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!restored || sent) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ values, multi }));
    } catch {
      // без черновика
    }
  }, [values, multi, restored, sent]);

  const set = (id: string, v: string) => setValues((s) => ({ ...s, [id]: v }));
  const toggle = (id: string, v: string) =>
    setMulti((m) => {
      const cur = m[id] ?? [];
      return { ...m, [id]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] };
    });

  const phone = values.phone?.trim() ?? "";
  const email = values.email?.trim() ?? "";
  const errors: Values = {};
  if (touched) {
    if (!values.company?.trim()) errors.company = "Укажите название компании";
    if (!values.contactName?.trim()) errors.contactName = "Укажите, к кому обращаться";
    if (!phone && !email) errors.phone = "Оставьте телефон или e-mail, иначе не сможем связаться";
    if (!consent) errors.consent = "Нужно согласие, иначе мы не сможем принять бриф";
  }
  if (phone && !phoneOk(phone)) errors.phone = "Номер неполный: нужно 10 цифр после +7";
  if (email && !EMAIL_RE.test(email)) errors.email = "Проверьте адрес: например, name@company.ru";

  const progress = useMemo(
    () =>
      AD_BRIEF.map((s) => ({
        id: s.id,
        title: s.title,
        done: s.fields.filter((f) => filled(f, values, multi)).length,
        total: s.fields.length,
      })),
    [values, multi],
  );

  const answers = () =>
    AD_BRIEF.flatMap((s) =>
      s.fields
        .filter((f) => !CONTACT_IDS.has(f.id))
        .map((f) => ({ section: s.title, q: f.label, a: answerOf(f, values, multi) }))
        .filter((x) => x.a),
    );

  const asText = () =>
    [
      "Бриф на размещение рекламы",
      `Контактное лицо: ${values.contactName?.trim() ?? ""}`,
      phone ? `Телефон: ${phone}` : null,
      email ? `E-mail: ${email}` : null,
      ...answers().map((x) => `${x.q}: ${x.a}`),
    ]
      .filter(Boolean)
      .join("\n");

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTouched(true);
    const form = e.currentTarget;
    const bad =
      !values.company?.trim() || !values.contactName?.trim() || (!phone && !email) || !consent ||
      (phone && !phoneOk(phone)) || (email && !EMAIL_RE.test(email));
    if (bad) {
      // фокус на первое поле с ошибкой: после перерисовки у него появится aria-invalid
      window.setTimeout(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0);
      return;
    }
    if (busy) return;
    setBusy(true);
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 10000);
    let ok = false;
    try {
      const res = await fetch(`${CRM_URL}/api/briefs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: values.company.trim(),
          contactName: values.contactName.trim(),
          phone,
          email,
          consent,
          website: values.website ?? "",
          page: (window.location.origin + window.location.pathname + window.location.search).slice(0, 500),
          answers: answers(),
        }),
        signal: ctrl.signal,
      });
      ok = res.ok;
    } catch {
      ok = false;
    } finally {
      window.clearTimeout(timer);
    }
    if (ok) {
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        // ничего
      }
      setSent({ delivered: true });
    } else {
      // запасной путь: текст брифа в буфер, отправить можно в Telegram
      const text = asText();
      let copied = false;
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch {
        copied = false;
      }
      setSent({ delivered: false, text, copied });
    }
    setBusy(false);
    window.scrollTo({ top: 0 });
  };

  const field = (f: BriefField) => {
    const id = `ab-${f.id}`;
    const err = errors[f.id];
    const hint = f.hint ? `${id}-hint` : undefined;
    const describedBy = [hint, err ? `${id}-err` : undefined].filter(Boolean).join(" ") || undefined;
    const label = (
      <span className={styles.label}>
        {f.label}
        {f.required ? <span className={styles.req}> (обязательно)</span> : null}
      </span>
    );
    const help = (
      <>
        {f.hint ? (
          <span id={hint} className={styles.hint}>
            {f.hint}
          </span>
        ) : null}
        {err ? (
          <span id={`${id}-err`} className={styles.error}>
            {err}
          </span>
        ) : null}
      </>
    );

    if (f.kind === "choice" || f.kind === "multi") {
      const picked = f.kind === "multi" ? (multi[f.id] ?? []) : [values[f.id]];
      const showDetail = f.detail && (f.kind === "multi" || values[f.id] === f.detail.when);
      return (
        <fieldset key={f.id} className={`${styles.field} ${styles.wide}`} aria-describedby={describedBy}>
          <legend className={styles.label}>{f.label}</legend>
          {help}
          <div className={styles.options}>
            {f.options?.map((o) => (
              <button
                key={o}
                type="button"
                className={styles.option}
                aria-pressed={picked.includes(o)}
                onClick={() => (f.kind === "multi" ? toggle(f.id, o) : set(f.id, values[f.id] === o ? "" : o))}
              >
                {o}
              </button>
            ))}
          </div>
          {showDetail && f.detail ? (
            <label className={styles.detail}>
              <span className={styles.hint}>{f.detail.label}</span>
              <input value={values[detailKey(f.id)] ?? ""} onChange={(e) => set(detailKey(f.id), e.target.value)} maxLength={500} />
            </label>
          ) : null}
        </fieldset>
      );
    }

    const common = {
      id,
      value: values[f.id] ?? "",
      "aria-invalid": Boolean(err),
      "aria-describedby": describedBy,
      autoComplete: f.autoComplete ?? "off",
    };
    return (
      <div key={f.id} className={`${styles.field} ${f.wide || f.kind === "area" ? styles.wide : ""}`}>
        <label htmlFor={id}>{label}</label>
        {f.kind === "area" ? (
          <textarea {...common} rows={3} maxLength={3000} onChange={(e) => set(f.id, e.target.value)} />
        ) : f.kind === "phone" ? (
          <input
            {...common}
            type="tel"
            inputMode="tel"
            placeholder="+7 (900) 000-00-00"
            onChange={(e) => set(f.id, maskPhone(e.target.value, values[f.id] ?? ""))}
            onFocus={() => set(f.id, phoneFocus(values[f.id] ?? ""))}
            onBlur={() => set(f.id, phoneBlur(values[f.id] ?? ""))}
          />
        ) : (
          <input
            {...common}
            type={f.kind === "email" ? "email" : "text"}
            inputMode={f.kind === "email" ? "email" : undefined}
            maxLength={f.kind === "email" ? 200 : 300}
            onChange={(e) => set(f.id, e.target.value)}
          />
        )}
        {help}
      </div>
    );
  };

  return (
    <div className={styles.page}>
      <header className={`wrap ${styles.top}`}>
        <Link href="/" className={styles.brand} aria-label="Корпорация, на главную">
          <LogoMark className={styles.mark} />
          <span>Корпорация</span>
        </Link>
        <a className={styles.phone} href={PHONES[0].href}>
          {PHONES[0].display}
        </a>
      </header>

      <main className={`wrap ${styles.grid}`}>
        <aside className={styles.side}>
          <h1 className={styles.title}>Бриф на размещение рекламы</h1>
          {sent ? null : (
            <>
              <p className={styles.lead}>
                Ответы помогут посчитать бюджет и предложить стратегию под ваш бизнес. Обязательны только название, контактное лицо и
                способ связи, остальное заполните по возможности.
              </p>
              <ol className={styles.steps}>
                {progress.map((p) => (
                  <li key={p.id} data-done={p.done === p.total}>
                    <a href={`#part-${p.id}`}>
                      <span>{p.title}</span>
                      <span className={styles.count}>
                        {p.done} из {p.total}
                      </span>
                    </a>
                  </li>
                ))}
              </ol>
              <p className={styles.saved}>Ответы сохраняются в этом браузере, можно вернуться позже.</p>
            </>
          )}
        </aside>

        {sent ? (
          <section className={styles.done} aria-live="polite">
            {sent.delivered ? (
              <>
                <h2 className={styles.doneTitle}>Бриф получен</h2>
                <p>
                  Спасибо! Изучим ответы и свяжемся с вами в течение рабочего дня, чтобы обсудить стратегию и бюджет. Если появятся
                  вопросы раньше, звоните: <a href={PHONES[0].href}>{PHONES[0].display}</a>.
                </p>
              </>
            ) : (
              <>
                <h2 className={styles.doneTitle}>Не удалось отправить бриф</h2>
                <p>
                  {sent.copied ? "Мы скопировали ответы. " : "Скопируйте ответы ниже. "}
                  Отправьте их нам в Telegram, и мы возьмём бриф в работу.
                </p>
                <a className="btn btn--primary" href={TELEGRAM.href} target="_blank" rel="noopener noreferrer">
                  Написать в Telegram {TELEGRAM.handle}
                </a>
                <textarea className={styles.doneText} readOnly value={sent.text} rows={12} aria-label="Текст брифа" />
              </>
            )}
          </section>
        ) : (
          <form className={styles.form} onSubmit={submit} noValidate>
            {AD_BRIEF.map((s, i) => (
              <section key={s.id} id={`part-${s.id}`} className={styles.section} aria-labelledby={`part-${s.id}-title`}>
                <h2 id={`part-${s.id}-title`} className={styles.sectionTitle}>
                  <span className={styles.num}>{i + 1}</span>
                  {s.title}
                </h2>
                {s.note ? <p className={styles.note}>{s.note}</p> : null}
                <div className={styles.fields}>{s.fields.map(field)}</div>
              </section>
            ))}

            {/* ловушка для ботов: человек это поле не видит */}
            <div className={styles.trap} aria-hidden="true">
              <label>
                Сайт компании
                <input tabIndex={-1} autoComplete="off" value={values.website ?? ""} onChange={(e) => set("website", e.target.value)} />
              </label>
            </div>

            <div className={styles.finish}>
              <label className={styles.consent}>
                <input
                  type="checkbox"
                  checked={consent}
                  aria-invalid={Boolean(errors.consent)}
                  aria-describedby={errors.consent ? "ab-consent-err" : undefined}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span>Согласен на обработку персональных данных для подготовки предложения</span>
              </label>
              {errors.consent ? (
                <span id="ab-consent-err" className={styles.error}>
                  {errors.consent}
                </span>
              ) : null}
              <button type="submit" className="btn btn--primary" disabled={busy}>
                {busy ? "Отправляем…" : "Отправить бриф"}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
