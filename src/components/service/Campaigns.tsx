"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { CONTEXT } from "@/content/services";
import { CINEMATIC_MQ } from "./SearchScene";
import styles from "./Campaigns.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Props = { campaigns: (typeof CONTEXT)["campaigns"] };

/**
 * «Три кампании, один клиент». На десктопе экран закрепляется, и точка-клиент идёт по пути
 * в такт прокрутке: Поиск, провал «ушёл сравнивать», РСЯ, горка «закрыл вкладку»,
 * Ретаргетинг и «Заявка». Станции стоят ровно над левыми краями карточек: путь строится
 * по их реальным координатам и перестраивается при ресайзе. На телефоне это вертикальная лента,
 * карточки загораются по очереди.
 */
export default function Campaigns({ campaigns }: Props) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const section = root.current!;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const all = (part: string) => [...section.querySelectorAll<HTMLElement>(`[data-part="${part}"]`)];
      const one = (part: string) => all(part)[0];
      const cards = all("card");
      const mm = gsap.matchMedia();

      mm.add(CINEMATIC_MQ, () => {
        const track = one("track");
        const svg = track.querySelector("svg")!;
        const base = svg.querySelector<SVGPathElement>('[data-part="base"]')!;
        const line = svg.querySelector<SVGPathElement>('[data-part="line"]')!;
        const stations = all("station");
        const gaps = all("gap");
        const dot = one("dot");
        const finish = one("finish");
        let len = 1;
        let marks: number[] = [];
        const prog = { v: reduce ? 1 : 0 };

        const build = () => {
          const tr = track.getBoundingClientRect();
          const W = track.clientWidth;
          const H = track.clientHeight;
          const mid = H * 0.5;
          const xs = cards.map((c) => c.getBoundingClientRect().left - tr.left + 9);
          const endX = W - finish.offsetWidth;
          // Между станциями человек уходит: вниз (сравнивает) и вверх (отвлёкся)
          const seg = (xa: number, xb: number, e: number) => {
            const dx = xb - xa;
            const xm = (xa + xb) / 2;
            return `C ${xa + dx * 0.24} ${mid} ${xm - dx * 0.2} ${e} ${xm} ${e} S ${xb - dx * 0.24} ${mid} ${xb} ${mid}`;
          };
          const ext = [H * 0.92, H * 0.08];
          const d = `M 0 ${mid} L ${xs[0]} ${mid} ${seg(xs[0], xs[1], ext[0])} ${seg(xs[1], xs[2], ext[1])} L ${endX} ${mid}`;
          svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
          base.setAttribute("d", d);
          line.setAttribute("d", d);
          len = line.getTotalLength();
          line.style.strokeDasharray = `${len}`;

          // Длина пути до каждой станции: путь идёт слева направо, ищем делением пополам
          const lenAtX = (x: number) => {
            let lo = 0;
            let hi = len;
            for (let i = 0; i < 24; i++) {
              const m = (lo + hi) / 2;
              if (line.getPointAtLength(m).x < x) lo = m;
              else hi = m;
            }
            return hi;
          };
          marks = xs.map(lenAtX);
          stations.forEach((s, i) => gsap.set(s, { x: xs[i], y: mid }));
          gaps.forEach((g, i) => gsap.set(g, { x: (xs[i] + xs[i + 1]) / 2, y: ext[i] }));
          gsap.set(finish, { x: endX, y: mid });
        };

        const update = () => {
          const at = prog.v * len;
          const pt = line.getPointAtLength(at);
          line.style.strokeDashoffset = `${len - at}`;
          gsap.set(dot, { x: pt.x, y: pt.y });
          marks.forEach((m, i) => {
            const on = at >= m - 1;
            stations[i].toggleAttribute("data-on", on);
            cards[i].toggleAttribute("data-on", on);
          });
          finish.toggleAttribute("data-on", prog.v > 0.995);
        };

        build();
        update();
        const onResize = () => {
          build();
          update();
        };
        window.addEventListener("resize", onResize);
        if (reduce) return () => window.removeEventListener("resize", onResize);

        section.setAttribute("data-ready", "");
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "+=170%",
            pin: true,
            scrub: 0.6,
          },
        });
        tl.to(prog, { v: 1, duration: 1, ease: "none", onUpdate: update }).to({}, { duration: 0.12 });

        return () => {
          window.removeEventListener("resize", onResize);
          section.removeAttribute("data-ready");
        };
      });

      // Телефон: без закрепления, карточки загораются, когда доходят до середины экрана
      mm.add(`not all and ${CINEMATIC_MQ}`, () => {
        if (reduce) return;
        section.setAttribute("data-ready", "");
        [...cards, one("finishMobile")].forEach((el) => {
          ScrollTrigger.create({
            trigger: el,
            start: "top 70%",
            end: "max",
            onToggle: (self) => el.toggleAttribute("data-on", self.isActive),
          });
        });
        return () => section.removeAttribute("data-ready");
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="light" data-pin aria-labelledby="campaigns-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <p className="label">{campaigns.label}</p>
          <h2 id="campaigns-title" className={styles.title}>
            {campaigns.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{campaigns.lead}</p>
        </header>

        <div className={styles.track} data-part="track" aria-hidden="true">
          <svg className={styles.svg} preserveAspectRatio="none">
            <path className={styles.base} data-part="base" />
            <path className={styles.line} data-part="line" />
          </svg>
          {campaigns.items.map((it) => (
            <span key={it.name} className={styles.station} data-part="station" />
          ))}
          {campaigns.gaps.map((g, i) => (
            <span key={g} className={styles.gap} data-part="gap" data-side={i === 0 ? "below" : "above"}>
              <span className={styles.gapText}>{g}</span>
            </span>
          ))}
          <span className={styles.finish} data-part="finish">
            {campaigns.finish}
          </span>
          <span className={styles.dot} data-part="dot">
            <span className={styles.dotLabel}>Клиент</span>
          </span>
        </div>

        <ol className={styles.cards}>
          {campaigns.items.map((it, i) => (
            <li key={it.name} className={styles.card} data-part="card">
              <p className={styles.num}>Касание {String(i + 1).padStart(2, "0")}</p>
              <h3 className={styles.name}>{it.name}</h3>
              <p className={styles.verb}>{it.verb}</p>
              <p className={styles.text}>{it.text}</p>
            </li>
          ))}
        </ol>

        <p className={styles.finishMobile} data-part="finishMobile" aria-hidden="true">
          <span className={styles.finishArrow}>→</span> {campaigns.finish}
        </p>
      </div>
    </section>
  );
}
