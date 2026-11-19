"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { KARKAS } from "@/content/karkas";
import b from "./Block.module.css";
import styles from "./MobileFan.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Мобильная версия. Три телефона стоят стопкой в перспективе; по скроллу крайние
 * разворачиваются веером к зрителю, средний выходит вперёд. Ниже ещё три экрана лентой.
 */
export default function MobileFan({ data }: { data: typeof KARKAS.mobile }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const el = root.current!;
      const [l, c, r] = el.querySelectorAll<HTMLElement>(`.${styles.phone}`);
      const tl = gsap.timeline({ scrollTrigger: { trigger: el.querySelector(`.${styles.stage}`), start: "top 85%", end: "center 45%", scrub: 0.8 } });
      tl.fromTo(l, { xPercent: 70, rotateY: 55, z: -160 }, { xPercent: 0, rotateY: 18, z: -60, ease: "power2.out" }, 0)
        .fromTo(r, { xPercent: -70, rotateY: -55, z: -160 }, { xPercent: 0, rotateY: -18, z: -60, ease: "power2.out" }, 0)
        .fromTo(c, { z: -220, rotateX: 18 }, { z: 40, rotateX: 0, ease: "power2.out" }, 0);
      gsap.fromTo(el.querySelectorAll(`.${styles.note}`), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, stagger: 0.12, duration: 0.7, ease: "power2.out", scrollTrigger: { trigger: el.querySelector(`.${styles.notes}`), start: "top 85%", once: true } });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={b.section} data-surface="light" aria-labelledby="kk-mobile">
      <div className="wrap">
        <div className={b.head}>
          <h2 id="kk-mobile" className={b.title}>
            {data.title}
            <span className={b.dot}>.</span>
          </h2>
          <p className={b.lead}>{data.lead}</p>
        </div>

        <div className={styles.stage}>
          {data.phones.map((p) => (
            <figure key={p.alt} className={styles.phone}>
              <Image src={p.img} alt={p.alt} sizes="(max-width: 860px) 40vw, 18rem" className={styles.screen} />
            </figure>
          ))}
        </div>

        <div className={styles.bottom}>
          <ul className={styles.notes}>
            {data.notes.map((n) => (
              <li key={n} className={styles.note}>
                {n}
              </li>
            ))}
          </ul>
          <ul className={styles.more}>
            {data.more.map((p) => (
              <li key={p.alt}>
                <Image src={p.img} alt={p.alt} sizes="9rem" className={styles.thumb} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
