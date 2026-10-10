"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { TURNKEY } from "@/content/turnkey";
import styles from "./Puzzle.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof TURNKEY)["puzzle"];

const S = 200;
const COLS = 3;
const ROWS = 2;
const T = 34;

/** Край детали от a до b: прямой или с выступом (dir 1) / впадиной (dir -1) посередине */
function edge(ax: number, ay: number, bx: number, by: number, dir: number) {
  if (!dir) return `L${bx} ${by}`;
  const dx = bx - ax;
  const dy = by - ay;
  // Нормаль к краю наружу детали при обходе по часовой
  const nx = (dy / S) * dir;
  const ny = (-dx / S) * dir;
  const p = (t: number, n: number) => `${ax + dx * t + nx * n} ${ay + dy * t + ny * n}`;
  return `L${p(0.38, 0)} C${p(0.32, T)} ${p(0.68, T)} ${p(0.62, 0)} L${bx} ${by}`;
}

/** Выступы: у соседних деталей знаки противоположны, поэтому они сцепляются */
const hTab = (c: number, r: number) => ((c + r) % 2 ? 1 : -1);
const vTab = (c: number, r: number) => ((c + r) % 2 ? -1 : 1);

function piece(c: number, r: number) {
  const x = c * S;
  const y = r * S;
  const top = r === 0 ? 0 : -vTab(c, r - 1);
  const right = c === COLS - 1 ? 0 : hTab(c, r);
  const bottom = r === ROWS - 1 ? 0 : vTab(c, r);
  const left = c === 0 ? 0 : -hTab(c - 1, r);
  return [
    `M${x} ${y}`,
    edge(x, y, x + S, y, top),
    edge(x + S, y, x + S, y + S, right),
    edge(x + S, y + S, x, y + S, bottom),
    edge(x, y + S, x, y, left),
    "Z",
  ].join(" ");
}

/** Откуда прилетает каждая деталь, пока пазл не собран */
const SCATTER = [
  { x: -90, y: -70, r: -18 },
  { x: 30, y: -110, r: 12 },
  { x: 120, y: -40, r: 22 },
  { x: -120, y: 80, r: 14 },
  { x: 10, y: 120, r: -10 },
  { x: 110, y: 90, r: -24 },
];

/**
 * «Как это собирается». Шесть частей маркетинга «Сферы» — детали пазла, разбросанные
 * и повёрнутые. Когда блок появляется, детали по очереди встают на места и сцепляются
 * выступами, вокруг собранного пазла загорается рамка, под ним цифры дела.
 */
export default function Puzzle({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const pieces = q("[data-piece]");
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        (q(`.${styles.board}`)[0] as HTMLElement).dataset.done = "";
        return;
      }
      gsap.set(pieces, {
        x: (i: number) => SCATTER[i].x,
        y: (i: number) => SCATTER[i].y,
        rotation: (i: number) => SCATTER[i].r,
        svgOrigin: (i: number) => `${(i % COLS) * S + S / 2} ${Math.floor(i / COLS) * S + S / 2}`,
      });
      const tl = gsap.timeline({ paused: true });
      tl.to(pieces, { x: 0, y: 0, rotation: 0, duration: 0.8, ease: "back.out(1.6)", stagger: 0.16 }).add(
        () => ((q(`.${styles.board}`)[0] as HTMLElement).dataset.done = ""),
        "+=0.05",
      );
      ScrollTrigger.create({ trigger: q(`.${styles.board}`)[0], start: "top 70%", once: true, onEnter: () => tl.play() });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="dark" aria-labelledby="puzzle-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <p className={styles.code}>
            Дело {data.code} · {data.client}
          </p>
          <h2 id="puzzle-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.text}</p>
          <dl className={styles.metrics}>
            {data.metrics.map((m) => (
              <div key={m.label}>
                <dt>{m.label}</dt>
                <dd>{m.value}</dd>
              </div>
            ))}
          </dl>
          <Link href={data.href} className={styles.more}>
            {data.more} →
          </Link>
        </header>

        <figure className={styles.board}>
          <svg viewBox={`-60 -60 ${COLS * S + 120} ${ROWS * S + 120}`} className={styles.svg} role="img" aria-label={`Части маркетинга: ${data.pieces.join(", ")}`}>
            <rect x="-6" y="-6" width={COLS * S + 12} height={ROWS * S + 12} rx="10" className={styles.frame} />
            {data.pieces.map((name, i) => {
              const c = i % COLS;
              const r = Math.floor(i / COLS);
              return (
                <g key={name} data-piece>
                  <path d={piece(c, r)} className={styles.piece} data-i={i} />
                  <text x={c * S + S / 2} y={r * S + S / 2} className={styles.label}>
                    {name}
                  </text>
                </g>
              );
            })}
          </svg>
        </figure>
      </div>
    </section>
  );
}
