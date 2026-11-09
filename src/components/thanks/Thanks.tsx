import Link from "next/link";
import { TELEGRAM, HOURS } from "@/content/contacts";
import styles from "./Thanks.module.css";

const STEPS = [
  ["Перезвоним", "В течение часа в рабочее время, " + HOURS + "."],
  ["Разберём задачу", "До созвона посмотрим вашу рекламу, сайт и конкурентов."],
  ["Предложим план", "На созвоне — каналы, сроки и цена. Без обязательств."],
];

/** Страница после отправки формы: заявка принята, что будет дальше */
export default function Thanks() {
  return (
    <section className={styles.thanks} data-surface="dark">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <p className="label">Заявка принята</p>
          <h1 className={styles.heading}>
            Спасибо<span className={styles.dot}>.</span>
          </h1>
          <p className={styles.lead}>Заявка у нас. Дальше всё по порядку:</p>
        </header>
        <ol className={styles.steps}>
          {STEPS.map(([name, text], i) => (
            <li key={name}>
              <span className={styles.num}>0{i + 1}</span>
              <b>{name}</b>
              <p>{text}</p>
            </li>
          ))}
        </ol>
        <div className={styles.actions}>
          <Link href="/kejsy/" className="btn btn--primary">
            Посмотреть кейсы
          </Link>
          <a href={TELEGRAM.href} className="btn" target="_blank" rel="noopener noreferrer">
            Написать в Telegram
          </a>
        </div>
      </div>
    </section>
  );
}
