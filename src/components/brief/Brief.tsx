import BriefForm from "./BriefForm";
import styles from "./Brief.module.css";
import { NEXT_CASE } from "@/content/cases";

/** Секция брифа внизу страницы. Контакты не дублируем: они в футере сразу ниже. */
export default function Brief() {
  return (
    <section id="brief" className={styles.brief} data-surface="dark">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <p className="label">Дело {NEXT_CASE}</p>
          <h2 className={styles.heading}>Отправить бриф</h2>
          <p className={styles.lead}>
            Четыре вопроса и контакт. Займёт меньше минуты, а на созвоне не
            придётся объяснять всё с нуля.
          </p>
        </header>
        <BriefForm idPrefix="brief" />
      </div>
    </section>
  );
}
