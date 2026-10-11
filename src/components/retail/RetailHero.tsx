import Link from "next/link";
import HeroLead from "@/components/hero/HeroLead";
import ShaderBackdrop from "@/components/backdrop/ShaderBackdrop";
import { SCAN } from "@/components/backdrop/shaders";
import type { RETAIL } from "@/content/retail";
import ShelfTag from "./ShelfTag";
import styles from "./RetailHero.module.css";

/**
 * Первый экран отраслевого решения для магазинов техники. Фоном штрихкод под лучом сканера,
 * справа ценник: луч проходит по коду, и на ценнике по очереди загораются плюсы магазина
 * перед маркетплейсом. Заголовок проявляется за тем же лучом.
 */
export default function RetailHero({ data }: { data: typeof RETAIL }) {
  return (
    <section id="top" className={styles.hero} data-surface="dark">
      <div className={styles.grain} aria-hidden="true" />
      <ShaderBackdrop frag={SCAN} className={styles.scan} />

      <div className={`wrap ${styles.grid}`}>
        <div className={styles.top}>
          <nav className={styles.crumbs} aria-label="Хлебные крошки">
            <Link href="/">Корпорация</Link>
            <span aria-hidden="true">/</span>
            <span>{data.sector}</span>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{data.name}</span>
          </nav>
          <p className={`label ${styles.kicker}`}>
            Ритейл техники <span className={styles.tools}>· {data.tools}</span>
          </p>
        </div>

        <h1 className={styles.title}>
          <span className="visually-hidden">{data.name}: </span>
          {data.title.map((word, i) => (
            <span key={word} className={styles.mask}>
              <span className={styles.line} style={{ "--i": i } as React.CSSProperties}>
                {word}
                {i === data.title.length - 1 ? <span className={styles.dot}>.</span> : null}
              </span>
            </span>
          ))}
        </h1>

        <div className={styles.leadWrap}>
          <div className={styles.lead}>
            <p className={styles.leadText}>{data.lead}</p>
            <HeroLead source="service" service={data.name} cta="Обсудить магазин" />
            <dl className={styles.facts}>
              {data.facts.map((f) => (
                <div key={f.label} className={styles.fact}>
                  <dt className={styles.factLabel}>
                    {f.label} <span className={styles.factRef}>{f.ref}</span>
                  </dt>
                  <dd className={styles.factValue}>{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <figure className={styles.stage}>
          <ShelfTag data={data.tag} />
          <figcaption className={styles.note}>{data.tag.note}</figcaption>
        </figure>
      </div>
    </section>
  );
}
