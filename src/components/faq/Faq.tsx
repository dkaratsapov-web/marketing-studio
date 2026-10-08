"use client";

import { useState } from "react";
import { FAQ } from "@/content/offer";
import styles from "./Faq.module.css";

// Микроразметка FAQPage: вопросы попадают в расширенный сниппет поиска
const JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
});

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className={styles.faq} data-surface="light">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON_LD }}
      />
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 className={styles.heading}>Вопросы</h2>
          <p className={styles.lead}>То, что спрашивают на первом созвоне.</p>
        </header>

        <ul className={styles.list}>
          {FAQ.map((f, i) => {
            const isOpen = open === i;
            return (
              <li key={f.q} className={styles.item} data-open={isOpen}>
                <button
                  type="button"
                  className={styles.question}
                  data-cursor-label="Открыть ответ"
                  aria-expanded={isOpen}
                  aria-controls={`faq-${i}`}
                  onClick={() => setOpen(isOpen ? null : i)}
                >
                  <span>{f.q}</span>
                  <span className={styles.icon} aria-hidden="true" />
                </button>
                <div id={`faq-${i}`} className={styles.answer} role="region">
                  <div className={styles.answerInner}>
                    <p>{f.a}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
