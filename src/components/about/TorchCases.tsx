"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { ABOUT } from "@/content/about";
import { CASES, type Metric } from "@/content/cases";
import styles from "./TorchCases.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof ABOUT)["cases"];

const fmt = (m: Metric) => m.text ?? `${m.prefix ?? ""}${(m.value ?? 0).toLocaleString("ru-RU")}${m.suffix ?? ""}`;

/**
 * Дела по отраслям в тёмной комнате. Поверх плиток лежит темнота с круглым просветом,
 * просвет идёт за курсором. Пока курсора нет, луч сам медленно обходит плитки, приглашая
 * посветить. С клавиатуры луч встаёт на плитку со ссылкой в фокусе. На сенсорных экранах
 * темноты нет: плитки загораются по очереди, когда доходят до середины экрана.
 */
export default function TorchCases({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current!;
      const wall = el.querySelector<HTMLElement>("[data-wall]")!;
      const tiles = gsap.utils.toArray<HTMLElement>("[data-tile]");
      // Без анимации темноты нет: все плитки видны сразу
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const mm = gsap.matchMedia();

      mm.add("(hover: hover) and (pointer: fine)", () => {
        wall.setAttribute("data-dark", "");
        const torch = { x: 20, y: 30, r: 0 };
        const draw = () => {
          wall.style.setProperty("--x", `${torch.x}%`);
          wall.style.setProperty("--y", `${torch.y}%`);
          wall.style.setProperty("--tr", `${torch.r}rem`);
        };
        const centre = (t: HTMLElement) => ({
          x: ((t.offsetLeft + t.offsetWidth / 2) / wall.offsetWidth) * 100,
          y: ((t.offsetTop + t.offsetHeight / 2) / wall.offsetHeight) * 100,
        });
        draw();

        // Сам по себе луч обходит плитки по кругу
        const wander = gsap.timeline({ repeat: -1, paused: true });
        [0, 1, 2, 5, 4, 3].forEach((k) => {
          const t = tiles[k];
          if (t) wander.to(torch, { x: () => centre(t).x, y: () => centre(t).y, duration: 1.6, ease: "sine.inOut", onUpdate: draw }).to({}, { duration: 0.5 });
        });
        gsap.to(torch, { r: 11, duration: 1, ease: "power2.out", onUpdate: draw, scrollTrigger: { trigger: wall, start: "top 70%", once: true } });
        const st = ScrollTrigger.create({
          trigger: wall,
          start: "top bottom",
          end: "bottom top",
          onToggle: (self) => (self.isActive && !wall.matches(":hover") ? wander.play() : wander.pause()),
        });

        const qx = gsap.quickTo(torch, "x", { duration: 0.35, ease: "power3.out", onUpdate: draw });
        const qy = gsap.quickTo(torch, "y", { duration: 0.35, ease: "power3.out", onUpdate: draw });
        const move = (e: PointerEvent) => {
          const b = wall.getBoundingClientRect();
          qx(((e.clientX - b.left) / b.width) * 100);
          qy(((e.clientY - b.top) / b.height) * 100);
        };
        const enter = () => wander.pause();
        const leave = () => st.isActive && wander.play();
        const focus = (e: FocusEvent) => {
          const t = (e.target as HTMLElement).closest<HTMLElement>("[data-tile]");
          if (!t) return;
          wander.pause();
          const c = centre(t);
          qx(c.x);
          qy(c.y);
        };
        wall.addEventListener("pointermove", move);
        wall.addEventListener("pointerenter", enter);
        wall.addEventListener("pointerleave", leave);
        wall.addEventListener("focusin", focus);
        return () => {
          wall.removeAttribute("data-dark");
          wander.kill();
          wall.removeEventListener("pointermove", move);
          wall.removeEventListener("pointerenter", enter);
          wall.removeEventListener("pointerleave", leave);
          wall.removeEventListener("focusin", focus);
        };
      });

      mm.add("not all and (hover: hover) and (pointer: fine)", () => {
        wall.setAttribute("data-touch", "");
        tiles.forEach((t) =>
          ScrollTrigger.create({
            trigger: t,
            start: "top 65%",
            end: "bottom 35%",
            onToggle: (self) => t.toggleAttribute("data-lit", self.isActive),
          }),
        );
        return () => wall.removeAttribute("data-touch");
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="dark" aria-labelledby="torch-title">
      <div className="wrap">
        <header className={styles.head}>
          <h2 id="torch-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        <div className={styles.wall} data-wall>
          <ul className={styles.tiles}>
            {CASES.map((c) => {
              const m = c.metrics[0];
              const href = data.links[c.code];
              return (
                <li key={c.code} className={styles.tile} data-tile>
                  <p className={styles.code}>Дело {c.code}</p>
                  <h3 className={styles.sector}>{c.sector}</h3>
                  <p className={styles.client}>{c.client}</p>
                  <p className={styles.metric}>
                    <span className={styles.value}>{fmt(m)}</span>
                    <span className={styles.mLabel}>{m.label}</span>
                  </p>
                  <p className={styles.caseTitle}>{c.title}</p>
                  {href ? (
                    <Link href={href} className={styles.more}>
                      {data.more}
                      <span className="visually-hidden">: {c.sector}</span>
                      <span aria-hidden="true"> →</span>
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
