"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { IPAPA } from "@/content/ipapa";
import styles from "./SyncPipe.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof IPAPA)["sync"];

/**
 * Синхронизация как конвейер: сайт, синк, проверка, бот и магазин. Каждый «час» по ленте
 * бежит пакет данных, строка журнала подсвечивается. В час, когда сайт отдал неполный
 * список, пакет упирается в проверку и краснеет: каталог в боте не обнулится.
 * Конвейер работает, только пока виден.
 */
export default function SyncPipe({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current!;
      const packet = el.querySelector<HTMLElement>("[data-packet]")!;
      const rows = gsap.utils.toArray<HTMLElement>("[data-row]", el);
      const nodes = gsap.utils.toArray<HTMLElement>("[data-node]", el);
      const fail = data.log.findIndex((l) => l.text.includes("остановлен"));
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        rows.forEach((r, i) => r.toggleAttribute("data-on", i === rows.length - 1));
        return;
      }

      const tl = gsap.timeline({ repeat: -1, paused: true });
      data.log.forEach((_, i) => {
        const stopped = i === fail;
        const dur = stopped ? 1.6 : 2.4;
        const last = stopped ? 2 : 3;
        tl.call(() => {
          rows.forEach((r, k) => r.toggleAttribute("data-on", k === i));
          packet.toggleAttribute("data-fail", false);
          nodes.forEach((n) => n.removeAttribute("data-hit"));
        })
          .addLabel(`run${i}`)
          .fromTo(packet, { left: "0%", autoAlpha: 1 }, { left: `${(last / 3) * 100}%`, duration: dur, ease: "none" });
        // Узел загорается, когда пакет до него доезжает
        for (let k = 0; k <= last; k++) tl.call(() => nodes[k].setAttribute("data-hit", ""), undefined, `run${i}+=${(k / last) * dur}`);
        if (stopped) tl.call(() => packet.toggleAttribute("data-fail", true)).to(packet, { x: -6, duration: 0.07, yoyo: true, repeat: 5 }).to({}, { duration: 1 });
        else tl.to({}, { duration: 0.6 });
        tl.to(packet, { autoAlpha: 0, duration: 0.2 });
      });

      ScrollTrigger.create({
        trigger: el.querySelector("[data-pipe]"),
        start: "top 85%",
        end: "bottom 15%",
        onToggle: (self) => (self.isActive ? tl.play() : tl.pause()),
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="light" aria-labelledby="sync-title">
      <div className="wrap">
        <header className={styles.head}>
          <h2 id="sync-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        <div className={styles.pipe} data-pipe>
          <div className={styles.rail} aria-hidden="true">
            <i className={styles.packet} data-packet />
          </div>
          <ol className={styles.nodes}>
            {data.stages.map((s, i) => (
              <li key={s.name} className={styles.node} data-node data-gate={i === 2 || undefined}>
                <span className={styles.dot} aria-hidden="true" />
                <b>{s.name}</b>
                <span>{s.text}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className={styles.lower}>
          <figure className={styles.log}>
            <figcaption className="label">{data.logNote}</figcaption>
            <ol>
              {data.log.map((l) => (
                <li key={l.t} data-row data-fail={l.text.includes("остановлен") || undefined}>
                  <time>{l.t}</time>
                  {l.text}
                </li>
              ))}
            </ol>
          </figure>
          <dl className={styles.facts}>
            {data.facts.map((f) => (
              <div key={f.label}>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
