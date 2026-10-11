"use client";

import Image from "next/image";
import { useState } from "react";
import type { AVTO } from "@/content/avtobiznes";
import styles from "./DealViews.module.css";

type Data = (typeof AVTO)["crm"];

/**
 * CRM для продажи авто. Одна и та же карточка сделки глазами менеджера и глазами клиента:
 * в режиме клиента закрытые строки (закупка, расходы, комиссия, VIN) сворачиваются под
 * замок, а на первый план выходят этап, фото авто и сумма. Сверху шкала этапов импорта.
 * Справа возможности CRM и настоящий фрагмент карточки сделки.
 */
export default function DealViews({ data }: { data: Data }) {
  const [client, setClient] = useState(false);
  const d = data.deal;

  return (
    <section className={styles.section} data-surface="light" aria-labelledby="crm-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="crm-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        <div className={styles.left}>
          <div className={styles.switch} role="group" aria-label="Чьими глазами смотреть на сделку">
            {data.modes.map((m, i) => (
              <button key={m} type="button" aria-pressed={client === (i === 1)} onClick={() => setClient(i === 1)}>
                {m}
              </button>
            ))}
            <span className={styles.knob} data-right={client || undefined} aria-hidden="true" />
          </div>

          <article className={styles.card} data-client={client || undefined} aria-live="polite">
            <div className={styles.cardHead}>
              <div>
                <p className={styles.dealTitle}>{client ? "Ваш автомобиль" : d.title}</p>
                <p className={styles.dealCar}>{d.car}</p>
              </div>
              <span className={styles.source}>{client ? "ссылка клиента" : `источник: ${d.source}`}</span>
            </div>

            {/* Шкала этапов импорта */}
            <ol className={styles.stages}>
              {data.stages.map((st, i) => (
                <li key={st} data-done={i < data.current || undefined} data-on={i === data.current || undefined}>
                  <span>{st}</span>
                </li>
              ))}
            </ol>

            <div className={styles.photo}>
              <Image src={d.img} alt="" className={styles.photoImg} sizes="14rem" />
            </div>

            <dl className={styles.rows}>
              {data.rows.map((r) => (
                <div key={r.k} className={styles.row} data-private={r.private || undefined}>
                  <div className={styles.rowIn}>
                    <dt>{r.k}</dt>
                    <dd>{r.v}</dd>
                  </div>
                </div>
              ))}
            </dl>
            <p className={styles.lockNote}>
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <rect x="3" y="7" width="10" height="7" rx="1.5" />
                <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
              </svg>
              {data.clientNote}
            </p>
          </article>
          <p className={styles.note}>{data.note}</p>
        </div>

        <div className={styles.right}>
          <ul className={styles.features}>
            {data.features.map((f) => (
              <li key={f.name}>
                <b>{f.name}</b>
                <span>{f.text}</span>
              </li>
            ))}
          </ul>
          <figure className={styles.shot}>
            <Image src={data.shot} alt={data.shotAlt} className={styles.shotImg} sizes="(max-width: 960px) 80vw, 22rem" />
            <figcaption>Фрагмент карточки сделки в CRM дела 023</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
