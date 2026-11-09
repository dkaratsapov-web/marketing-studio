import Link from "next/link";
import { EDITION, LEGAL_LINKS, type LegalDoc } from "@/content/legal";
import styles from "./Legal.module.css";

/** Страница правового документа: заголовок, редакция, нумерованные разделы и ссылки на соседние документы */
export default function LegalPage({ doc, path }: { doc: LegalDoc; path: string }) {
  return (
    <article className={styles.page} data-surface="dark">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <p className="label">{doc.label}</p>
          <h1 className={styles.title}>{doc.title}</h1>
          <p className={styles.edition}>Редакция от {EDITION}</p>
        </header>

        <div className={styles.body}>
          {doc.sections.map((s, i) => (
            <section key={s.title} className={styles.section}>
              <h2>
                <span className={styles.num}>{i + 1}.</span> {s.title}
              </h2>
              {s.body.map((b, j) =>
                Array.isArray(b) ? (
                  <ul key={j}>
                    {b.map((li) => (
                      <li key={li}>{li}</li>
                    ))}
                  </ul>
                ) : (
                  <p key={j}>{b}</p>
                ),
              )}
            </section>
          ))}
        </div>

        <nav className={styles.other} aria-label="Другие документы">
          {Object.values(LEGAL_LINKS)
            .filter((l) => l.href !== path)
            .map((l) => (
              <Link key={l.href} href={l.href}>
                {l.title}
              </Link>
            ))}
        </nav>
      </div>
    </article>
  );
}
