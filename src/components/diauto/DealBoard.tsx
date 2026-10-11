"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { DIAUTO } from "@/content/diauto";
import Lightbox, { type Shot } from "@/components/case/Lightbox";
import styles from "./DealBoard.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof DIAUTO)["crm"];

/**
 * CRM. Сверху доска из семи этапов, по ней скроллом едет одна сделка: от заявки из квиза
 * до выдачи ключей. Пройденные этапы гаснут галочкой, текущий горит. Ниже настоящие
 * снимки доски и карточки сделки, по клику открываются на весь экран.
 */
export default function DealBoard({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  const n = data.stages.length;
  const shots: Shot[] = [
    { img: data.board, alt: data.boardAlt, name: "Доска сделок", note: data.note },
    { img: data.dealShot, alt: data.dealAlt, name: "Карточка сделки", note: data.note },
  ];

  useGSAP(
    () => {
      const el = root.current!;
      const board = el.querySelector<HTMLElement>("[data-board]")!;
      const cols = el.querySelectorAll<HTMLElement>("[data-col]");
      let last = -1;
      const render = (p: number) => {
        const at = Math.min(n - 1, Math.floor(p * n));
        if (at === last) return;
        last = at;
        board.style.setProperty("--at", String(at));
        // На телефоне доска шире экрана: прокручиваем её за сделкой
        if (board.scrollWidth > board.clientWidth) {
          board.scrollTo({ left: (at / n) * board.scrollWidth - board.clientWidth * 0.3, behavior: "smooth" });
        }
        cols.forEach((c, i) => {
          c.toggleAttribute("data-done", i < at);
          c.toggleAttribute("data-on", i === at);
        });
      };
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        render(1);
        return;
      }
      render(0);
      ScrollTrigger.create({ trigger: board, start: "top 75%", end: "bottom 30%", onUpdate: (self) => render(self.progress) });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="light" aria-labelledby="crm-title">
      <div className="wrap">
        <header className={styles.head}>
          <h2 id="crm-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        <div className={styles.board} data-board style={{ "--n": n } as React.CSSProperties}>
          <ol className={styles.cols}>
            {data.stages.map((st) => (
              <li key={st} className={styles.col} data-col>
                <span className={styles.check} aria-hidden="true" />
                {st}
              </li>
            ))}
          </ol>
          <div className={styles.lane} aria-hidden="true">
            <div className={styles.deal}>
              <b>{data.deal.title}</b>
              <span>{data.deal.car}</span>
              <span className={styles.total}>{data.deal.total}</span>
            </div>
          </div>
        </div>

        <div className={styles.bottom}>
          <ul className={styles.features}>
            {data.features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <div className={styles.shots}>
            {shots.map((s, i) => (
              <button key={s.name} type="button" className={styles.shot} data-tall={i === 1 || undefined} onClick={() => setOpen(i)}>
                <Image src={s.img} alt={s.alt} className={styles.shotImg} sizes="(max-width: 960px) 92vw, 40vw" />
                <span className={styles.shotName}>{s.name} ↗</span>
              </button>
            ))}
            <p className={styles.note}>{data.note}</p>
          </div>
        </div>
      </div>
      <Lightbox shots={shots} index={open} onChange={setOpen} />
    </section>
  );
}
