"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { CINEMATIC_MQ } from "@/components/service/SearchScene";
import type { IPAPA } from "@/content/ipapa";
import styles from "./AppGallery.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof IPAPA)["app"];

/**
 * Экраны мини-приложения на ленте, как телефоны на витрине магазина. На десктопе блок
 * закреплён, скролл ведёт ленту вбок, а каждый телефон поворачивается к зрителю, когда
 * проходит центр, и отворачивается, уходя дальше. На телефоне лента листается пальцем.
 * Размеры телефонов и подписей одинаковые, высота блока не меняется.
 */
export default function AppGallery({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current!;
      const track = el.querySelector<HTMLElement>("[data-track]")!;
      const phones = gsap.utils.toArray<HTMLElement>("[data-phone]", el);

      // Поворот каждого телефона по расстоянию до центра окна
      const tilt = () => {
        const mid = window.innerWidth / 2;
        phones.forEach((p) => {
          const r = p.getBoundingClientRect();
          const d = gsap.utils.clamp(-1, 1, (r.left + r.width / 2 - mid) / (window.innerWidth * 0.55));
          p.style.setProperty("--d", d.toFixed(3));
        });
      };

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const mm = gsap.matchMedia();
      mm.add(CINEMATIC_MQ, () => {
        const dist = () => track.scrollWidth - el.querySelector<HTMLElement>("[data-viewport]")!.clientWidth;
        gsap.to(track, {
          x: () => -dist(),
          ease: "none",
          scrollTrigger: {
            trigger: el.querySelector("[data-stage]"),
            start: "top top",
            end: () => `+=${dist()}`,
            pin: true,
            scrub: 0.5,
            invalidateOnRefresh: true,
            onUpdate: tilt,
            onRefresh: tilt,
          },
        });
      });
      mm.add(`not all and ${CINEMATIC_MQ}`, () => {
        const vp = el.querySelector<HTMLElement>("[data-viewport]")!;
        vp.addEventListener("scroll", tilt, { passive: true });
        tilt();
        return () => vp.removeEventListener("scroll", tilt);
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="light" aria-labelledby="app-title">
      <div className={styles.stage} data-stage>
        <div className={`wrap ${styles.head}`}>
          <h2 id="app-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </div>

        <div className={styles.viewport} data-viewport>
          <ol className={styles.track} data-track>
            {data.screens.map((s, i) => (
              <li key={s.name} className={styles.item}>
                <div className={styles.phone} data-phone>
                  <Image src={s.img} alt={`Мини-приложение айпапа.рф: ${s.name.toLowerCase()}`} className={styles.img} sizes="(max-width: 960px) 60vw, 16rem" />
                </div>
                <p className={styles.cap}>
                  <b>
                    <span>{String(i + 1).padStart(2, "0")}</span> {s.name}
                  </b>
                  {s.text}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
