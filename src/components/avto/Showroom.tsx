"use client";

import Image from "next/image";
import { useState } from "react";
import type { AVTO } from "@/content/avtobiznes";
import styles from "./Showroom.module.css";

type Data = (typeof AVTO)["showroom"];

/**
 * Шоурум: настоящие экраны системы из дела 023 стоят на подиуме, как машины в салоне.
 * Переключение разворачивает подиум (экран уходит поворотом и выходит следующий),
 * длинная страница при наведении сама пролистывается сверху вниз. Снизу ряд миниатюр.
 */
export default function Showroom({ data }: { data: Data }) {
  const [on, setOn] = useState(0);
  const s = data.slides[on];
  const n = data.slides.length;

  return (
    <section className={styles.section} data-surface="dark" aria-labelledby="showroom-title">
      <div className="wrap">
        <header className={styles.head}>
          <h2 id="showroom-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        <div className={styles.stage}>
          <div className={styles.spot} aria-hidden="true" />
          <figure key={s.key} className={styles.exhibit} data-kind={s.kind}>
            <div className={styles.frame}>
              {s.kind !== "phone" ? (
                <span className={styles.chrome} aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
              ) : null}
              <div className={styles.view}>
                <Image src={s.img} alt={s.alt} className={styles.img} sizes="(max-width: 960px) 92vw, 60vw" />
              </div>
            </div>
            <span className={styles.podium} aria-hidden="true" />
            <figcaption className={styles.caption}>
              <b>
                {String(on + 1).padStart(2, "0")} · {s.name}
              </b>
              <span>{s.text}</span>
            </figcaption>
          </figure>
          <button type="button" className={styles.arrow} data-dir="prev" aria-label="Предыдущий экран" onClick={() => setOn((on + n - 1) % n)}>
            ←
          </button>
          <button type="button" className={styles.arrow} data-dir="next" aria-label="Следующий экран" onClick={() => setOn((on + 1) % n)}>
            →
          </button>
        </div>

        <ul className={styles.lineup}>
          {data.slides.map((x, i) => (
            <li key={x.key}>
              <button type="button" className={styles.thumb} aria-pressed={i === on} onClick={() => setOn(i)}>
                <span className={styles.thumbImg} data-kind={x.kind}>
                  <Image src={x.img} alt="" sizes="10rem" />
                </span>
                <span className={styles.thumbName}>{x.name}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className={styles.note}>{data.note}</p>
      </div>
    </section>
  );
}
