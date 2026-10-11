"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { AVTO } from "@/content/avtobiznes";
import styles from "./RoadTrip.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof AVTO)["route"];

/** Дорога: на широком экране серпантин слева направо, на узком сверху вниз */
const WIDE = { box: "0 0 1200 420", d: "M40 320C200 320 220 110 400 110S600 320 800 320S1000 110 1160 110" };
const TALL = { box: "0 0 400 1200", d: "M110 40C110 200 300 220 300 400S110 600 110 800S300 1000 300 1160" };

/**
 * Маршрут покупателя. Блок держится, пока по дороге едет машина: её положение и поворот
 * берутся из точки на кривой (getPointAtLength), остановки загораются, когда машина их
 * проезжает. Подписи остановок стоят у своих точек дороги, их места тоже считаются по кривой.
 */
export default function RoadTrip({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);
  const n = data.stops.length;
  const at = (i: number) => 0.04 + (0.92 * i) / (n - 1);

  useGSAP(
    () => {
      const el = root.current!;
      const mm = gsap.matchMedia();
      mm.add({ wide: "(min-width: 761px)", tall: "(max-width: 760px)" }, (ctx) => {
        const kind = ctx.conditions!.wide ? "wide" : "tall";
        const scene = el.querySelector<HTMLElement>(`[data-road="${kind}"]`)!;
        const path = scene.querySelector<SVGPathElement>("[data-path]")!;
        const done = scene.querySelector<SVGPathElement>("[data-done]")!;
        const car = scene.querySelector<HTMLElement>("[data-car]")!;
        const stops = scene.querySelectorAll<HTMLElement>("[data-stop]");
        const [, , vw, vh] = path.ownerSVGElement!.getAttribute("viewBox")!.split(" ").map(Number);
        const len = path.getTotalLength();
        const place = (t: number) => path.getPointAtLength(t * len);

        stops.forEach((s, i) => {
          const pnt = place(at(i));
          s.style.left = `${(pnt.x / vw) * 100}%`;
          s.style.top = `${(pnt.y / vh) * 100}%`;
          // На вертикальной дороге подпись ставим в ту сторону, где больше места
          if (kind === "tall") s.dataset.side = pnt.x / vw > 0.5 ? "b" : "a";
        });

        const v = { t: 0 };
        const render = () => {
          const pnt = place(v.t);
          const ahead = place(Math.min(1, v.t + 0.004));
          const ang = (Math.atan2(ahead.y - pnt.y, ahead.x - pnt.x) * 180) / Math.PI;
          car.style.left = `${(pnt.x / vw) * 100}%`;
          car.style.top = `${(pnt.y / vh) * 100}%`;
          car.style.rotate = `${ang}deg`;
          done.style.strokeDashoffset = String(1 - v.t);
          stops.forEach((s, i) => s.toggleAttribute("data-on", v.t >= at(i) - 0.01));
        };

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          v.t = 1;
          render();
          return;
        }
        render();
        gsap.to(v, {
          t: 1,
          ease: "none",
          onUpdate: render,
          scrollTrigger: { trigger: el.querySelector("[data-track]"), start: "top top", end: "bottom bottom", scrub: 0.6 },
        });
      });
    },
    { scope: root },
  );

  const road = (kind: "wide" | "tall") => {
    const r = kind === "wide" ? WIDE : TALL;
    return (
      <div className={styles.road} data-road={kind}>
        <svg viewBox={r.box} className={styles.svg} aria-hidden="true">
          <path d={r.d} className={styles.asphalt} />
          <path d={r.d} className={styles.dash} />
          <path d={r.d} className={styles.done} data-done pathLength={1} strokeDasharray="1" />
          <path d={r.d} data-path fill="none" stroke="none" />
        </svg>
        {data.stops.map((s, i) => (
          <div key={s.name} className={styles.stop} data-stop data-side={i % 2 ? "b" : "a"}>
            <span className={styles.pin} aria-hidden="true" />
            <div className={styles.label}>
              <b>
                <span className={styles.no}>{String(i + 1).padStart(2, "0")}</span>
                {s.name}
              </b>
              <span>{s.text}</span>
            </div>
          </div>
        ))}
        <span className={styles.car} data-car aria-hidden="true">
          <svg viewBox="0 0 60 30">
            <rect x="2" y="3" width="56" height="24" rx="9" className={styles.carBody} />
            <rect x="22" y="6" width="20" height="18" rx="4" className={styles.carRoof} />
            <rect x="44" y="7" width="7" height="16" rx="2" className={styles.carGlass} />
          </svg>
        </span>
      </div>
    );
  };

  return (
    <section ref={root} className={styles.section} data-surface="dark" aria-labelledby="route-title">
      <div className={styles.track} data-track>
        <div className={`wrap ${styles.sticky}`}>
          <header className={styles.head}>
            <h2 id="route-title" className={styles.title}>
              {data.title}
              <span className={styles.dotMark}>.</span>
            </h2>
            <p className={styles.lead}>{data.lead}</p>
          </header>
          {road("wide")}
          {road("tall")}
        </div>
      </div>
    </section>
  );
}
