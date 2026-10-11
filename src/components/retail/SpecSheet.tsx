import type { RETAIL } from "@/content/retail";
import styles from "./SpecSheet.module.css";

type Data = (typeof RETAIL)["faq"];

/**
 * Вопросы как лист характеристик в карточке товара: слева параметр, справа значение
 * понятным языком. Всё открыто сразу, как в настоящих характеристиках.
 */
export default function SpecSheet({ data, product }: { data: Data; product: string }) {
  return (
    <section className={styles.section} data-surface="light" aria-labelledby="spec-title">
      <div className="wrap">
        <header className={styles.head}>
          <h2 id="spec-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.product}>{product}</p>
        </header>

        <dl className={styles.sheet}>
          {data.items.map((x) => (
            <div key={x.q} className={styles.row}>
              <dt className={styles.q}>{x.q}</dt>
              <dd className={styles.a}>{x.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
