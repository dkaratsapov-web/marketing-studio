"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { AVTO } from "@/content/avtobiznes";
import styles from "./DealViews.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof AVTO)["crm"];

/**
 * CRM для продажи авто: одна сделка на двух экранах. Слева окно CRM менеджера, справа телефон
 * клиента, открытый по ссылке. Один момент движения: менеджер «выдаёт ссылку», по проводу бежит
 * импульс, публичные строки по очереди вспыхивают у менеджера и появляются в телефоне, а закрытые
 * (закупка, расходы, комиссия, VIN) уходят под замок и в телефон не попадают. Кнопкой
 * «Выдать ссылку» сцену можно повторить. Ниже спокойная сетка возможностей.
 */
export default function DealViews({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const d = data.deal;
  const pub = data.rows.filter((r) => !r.private);

  useGSAP(
    () => {
      const el = root.current!;
      const sent = el.querySelectorAll<HTMLElement>("[data-pub]");
      const locks = el.querySelectorAll<HTMLElement>("[data-priv]");
      const recv = el.querySelectorAll<HTMLElement>("[data-recv]");
      const pulse = el.querySelector<HTMLElement>("[data-pulse]")!;
      const phone = el.querySelector<HTMLElement>("[data-phone]")!;
      const lockNote = el.querySelector<HTMLElement>("[data-locknote]")!;

      const t = gsap.timeline({ paused: true, defaults: { ease: "power2.out" } });
      t.set(sent, { "--hl": 0 })
        .set(locks, { "--lock": 0 })
        .set(recv, { autoAlpha: 0, y: 10 })
        .set(pulse, { "--x": 0, autoAlpha: 0 })
        .set(phone, { "--glow": 0 })
        .set(lockNote, { autoAlpha: 0 })
        // Закрытые строки уходят под замок
        .to(locks, { "--lock": 1, duration: 0.35, stagger: 0.06 }, 0.2)
        .to(lockNote, { autoAlpha: 1, duration: 0.3 }, "<0.2");
      // Каждая публичная строка: вспышка у менеджера, импульс по проводу, строка в телефоне
      sent.forEach((row, i) => {
        t.to(row, { "--hl": 1, duration: 0.25 }, 0.8 + i * 0.6)
          .fromTo(pulse, { "--x": 0, autoAlpha: 1 }, { "--x": 1, duration: 0.45, ease: "power1.inOut" }, "<")
          .to(recv[i], { autoAlpha: 1, y: 0, duration: 0.35 }, "<0.35")
          .to(row, { "--hl": 0.35, duration: 0.3 }, "<0.1");
      });
      t.to(pulse, { autoAlpha: 0, duration: 0.2 }).to(phone, { "--glow": 1, duration: 0.4 }, "<");
      tl.current = t;

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        t.progress(1);
        return;
      }
      // На узком экране телефон стоит под окном CRM: ждём, пока он сам войдёт в кадр
      const narrow = window.matchMedia("(max-width: 1100px)").matches;
      ScrollTrigger.create({ trigger: narrow ? phone : el.querySelector("[data-pair]"), start: narrow ? "top 80%" : "top 70%", once: true, onEnter: () => t.play() });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="light" aria-labelledby="crm-title">
      <div className={`wrap ${styles.grid}`}>
        <h2 id="crm-title" className={styles.title}>
          {data.title}
          <span className={styles.dotMark}>.</span>
        </h2>
        <p className={styles.lead}>{data.lead}</p>

        <div className={styles.pair} data-pair>
          {/* Окно CRM менеджера */}
          <figure className={styles.crm}>
            <figcaption className={styles.who}>{data.manager}</figcaption>
            <div className={styles.app}>
              <div className={styles.appBar} aria-hidden="true">
                <span className={styles.appLogo} />
                <b>CRM ДиАвто69</b>
                <span className={styles.appTab}>Сделки</span>
                <span>Задачи</span>
                <span>Аналитика</span>
              </div>

              <div className={styles.dealHead}>
                <div>
                  <p className={styles.dealTitle}>
                    {d.title} <span>{d.no}</span>
                  </p>
                  <p className={styles.dealCar}>
                    {d.car}, {d.origin}
                  </p>
                </div>
                <span className={styles.source}>Источник: {d.source}</span>
              </div>

              <ol className={styles.stages} aria-label="Этапы сделки">
                {data.stages.map((st, i) => (
                  <li key={st} data-done={i < data.current || undefined} data-on={i === data.current || undefined} aria-current={i === data.current ? "step" : undefined}>
                    {st}
                  </li>
                ))}
              </ol>

              <div className={styles.body}>
                <div className={styles.photo}>
                  <Image src={d.img} alt={`${d.car} из каталога ДиАвто69`} className={styles.photoImg} sizes="(max-width: 960px) 40vw, 18rem" />
                </div>
                <dl className={styles.rows}>
                  {data.rows.map((r) => (
                    <div key={r.k} className={styles.row} {...(r.private ? { "data-priv": "" } : { "data-pub": "" })}>
                      <dt>{r.k}</dt>
                      <dd>
                        <span className={styles.val}>{r.v}</span>
                        {r.private ? (
                          <svg className={styles.lock} viewBox="0 0 16 16" aria-label="не уходит клиенту">
                            <rect x="3" y="7" width="10" height="7" rx="1.5" />
                            <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
                          </svg>
                        ) : null}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className={styles.appFoot}>
                <p className={styles.lockNote} data-locknote>
                  {data.locked}
                </p>
                <button type="button" className={styles.send} onClick={() => tl.current?.restart()}>
                  {data.send}
                </button>
              </div>
            </div>
          </figure>

          {/* Провод ссылки: по нему бежит импульс */}
          <span className={styles.wire} aria-hidden="true">
            <i data-pulse />
          </span>

          {/* Телефон клиента */}
          <figure className={styles.client}>
            <figcaption className={styles.who}>{data.client}</figcaption>
            <div className={styles.phone} data-phone>
              <p className={styles.phBrand}>{data.phone.brand}</p>
              <p className={styles.phHello}>{data.phone.hello}</p>
              <div className={styles.phPhoto}>
                <Image src={d.img} alt="" className={styles.photoImg} sizes="14rem" />
              </div>
              <p className={styles.phCar}>{d.car}</p>
              <ol className={styles.phStages} aria-hidden="true">
                {data.stages.map((st, i) => (
                  <li key={st} data-done={i < data.current || undefined} data-on={i === data.current || undefined} />
                ))}
              </ol>
              <dl className={styles.phRows}>
                {pub.map((r) => (
                  <div key={r.k} data-recv>
                    <dt>{r.k}</dt>
                    <dd>{r.v}</dd>
                  </div>
                ))}
              </dl>
              <p className={styles.phArrival}>{data.phone.arrival}</p>
            </div>
          </figure>
        </div>

        <ul className={styles.features}>
          {data.features.map((f) => (
            <li key={f.name}>
              <h3>{f.name}</h3>
              <p>{f.text}</p>
            </li>
          ))}
        </ul>
        <p className={styles.note}>{data.note}</p>
      </div>
    </section>
  );
}
