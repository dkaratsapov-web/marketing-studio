import HeroLead from "@/components/hero/HeroLead";
import type { BOTS } from "@/content/bots";
import styles from "./BotBrief.module.css";

/**
 * Финальный блок: как первое сообщение новому боту. Команда /start крупно, рядом
 * короткий текст и форма телефона.
 */
export default function BotBrief({ data, service }: { data: (typeof BOTS)["brief"]; service: string }) {
  return (
    <section id="brief" className={styles.section} data-surface="dark" aria-labelledby="bot-brief-title">
      <div className={`wrap ${styles.grid}`}>
        <p className={styles.start} aria-hidden="true">
          /start
          <span className={styles.caret} />
        </p>
        <div className={styles.body}>
          <h2 id="bot-brief-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
          <HeroLead source="service" service={service} cta={data.cta} />
        </div>
      </div>
    </section>
  );
}
