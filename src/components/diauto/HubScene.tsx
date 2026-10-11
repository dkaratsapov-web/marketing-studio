"use client";

import Image from "next/image";
import { forwardRef } from "react";
import { gsap } from "gsap";
import type { DIAUTO } from "@/content/diauto";
import styles from "./HubScene.module.css";

type Hub = (typeof DIAUTO)["hero"]["hub"];

/** Сцена в системе 600×600: центр карточки и кольцо витрин вокруг неё */
const CX = 300;
const CY = 345;
const R = 228;
const ANGLES = [-38, -4, 32, 70, 110, 148, 184];
export const NODE_AT = ANGLES.map((a) => ({
  x: CX + Math.cos((a * Math.PI) / 180) * R,
  y: CY + Math.sin((a * Math.PI) / 180) * R,
}));

/**
 * Шаги сцены: в канале выходит пост, по нему проходит линия разбора, из поста вырастает
 * карточка каталога, и от неё по очереди тянутся провода к сайту, боту, MAX и рекламным
 * площадкам. Каждая витрина загорается, когда до неё доходит провод. Всё обратимо.
 */
export function addHubSteps(tl: gsap.core.Timeline, root: HTMLElement) {
  const q = (p: string) => root.querySelector<HTMLElement>(`[data-part="${p}"]`)!;
  const wires = root.querySelectorAll<SVGPathElement>("[data-wire]");
  const nodes = root.querySelectorAll<HTMLElement>("[data-node]");

  tl.set(q("post"), { autoAlpha: 0, y: 20 })
    .set(q("scan"), { scaleX: 0 })
    .set(q("card"), { autoAlpha: 0, scale: 0.4, x: "-40%", y: "-45%" })
    .set(wires, { strokeDashoffset: 1 })
    .set(nodes, { "--on": 0 })
    .to(q("post"), { autoAlpha: 1, y: 0, duration: 0.5, ease: "power3.out" })
    .to(q("scan"), { scaleX: 1, duration: 0.6, ease: "power1.inOut" }, "+=0.15")
    .to(q("card"), { autoAlpha: 1, scale: 1, x: "0%", y: "0%", duration: 0.8, ease: "power3.out" }, "-=0.1");
  wires.forEach((w, i) => {
    tl.to(w, { strokeDashoffset: 0, duration: 0.35, ease: "power2.in" }, i ? "-=0.2" : "+=0.1").to(
      nodes[i],
      { "--on": 1, duration: 0.25 },
      "-=0.05",
    );
  });
  return tl;
}

/** Пост канала, карточка каталога в центре и кольцо витрин */
const HubScene = forwardRef<HTMLDivElement, { hub: Hub }>(function HubScene({ hub }, ref) {
  return (
    <div ref={ref} className={styles.scene}>
      <svg className={styles.wires} viewBox="0 0 600 600" aria-hidden="true">
        {NODE_AT.map((n, i) => (
          <path key={i} data-wire d={`M${CX} ${CY} L${n.x.toFixed(1)} ${n.y.toFixed(1)}`} pathLength={1} strokeDasharray="1" />
        ))}
      </svg>

      <div className={styles.post} data-part="post" aria-hidden="true">
        <span className={styles.channel}>
          <i />
          {hub.post.channel}
        </span>
        <p className={styles.postText}>{hub.post.text}</p>
        <span className={styles.scan} data-part="scan" />
      </div>

      <div className={styles.card} data-part="card">
        <Image src={hub.card} alt={hub.cardAlt} className={styles.cardImg} sizes="(max-width: 960px) 40vw, 16vw" priority />
      </div>

      {hub.nodes.map((name, i) => (
        <span
          key={name}
          className={styles.node}
          data-node
          data-ad={i > 2 || undefined}
          style={{ left: `${(NODE_AT[i].x / 600) * 100}%`, top: `${(NODE_AT[i].y / 600) * 100}%` }}
          aria-hidden="true"
        >
          {name}
        </span>
      ))}
    </div>
  );
});

export default HubScene;
