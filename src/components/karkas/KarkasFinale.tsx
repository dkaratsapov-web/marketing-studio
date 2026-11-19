import Link from "next/link";
import HeroLead from "@/components/hero/HeroLead";
import b from "./Block.module.css";
import styles from "./KarkasFinale.module.css";

type Props = { client: string; others: { href: string; text: string }[] };

/** Финал дела: короткая заявка и другие дела */
export default function KarkasFinale({ client, others }: Props) {
  return (
    <section className={b.section} data-surface="light" aria-labelledby="kk-finale">
      <div className={`wrap ${styles.grid}`}>
        <div>
          <h2 id="kk-finale" className={b.title}>
            Нужен сайт, который продаёт стройку<span className={b.dot}>?</span>
          </h2>
          <p className={`${b.lead} ${styles.lead}`}>Оставьте телефон: разберём ваш сайт и рекламу и скажем, с чего начать.</p>
          <div className={styles.form} data-surface="dark">
            <HeroLead source="service" service={`Кейс ${client}`} cta="Хочу такой сайт" />
          </div>
        </div>
        <nav className={styles.others} aria-label="Другие дела">
          <p className="label">Другие дела</p>
          {others.map((o) => (
            <Link key={o.href} href={o.href} className={styles.link}>
              {o.text}
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}
