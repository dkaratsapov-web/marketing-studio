"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import HeroLead from "@/components/hero/HeroLead";
import type { IPAPA } from "@/content/ipapa";
import styles from "./PriceTags.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof IPAPA)["result"];

/**
 * Итоги на ценниках, как на витрине магазина техники: ценники висят на нитках, при появлении
 * падают сверху и раскачиваются до остановки, от курсора покачиваются снова. Ниже каналы,
 * стек и форма заявки.
 */
export default function PriceTags({ data, client, others }: { data: Data; client: string; others: { href: string; text: string }[] }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const tags = gsap.utils.toArray<HTMLElement>("[data-tag]", root.current);
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.set(tags, { yPercent: -60, autoAlpha: 0, rotation: (i) => (i % 2 ? 14 : -14) });
      ScrollTrigger.create({
        trigger: root.current!.querySelector("[data-rack]"),
        start: "top 75%",
        once: true,
        onEnter: () =>
          gsap.to(tags, { yPercent: 0, autoAlpha: 1, rotation: 0, duration: 1.6, ease: "elastic.out(1, 0.35)", stagger: 0.12 }),
      });
      // Курсор задевает ценник, и он качается
      const cleanups = tags.map((t) => {
        const swing = (e: PointerEvent) => {
          const r = t.getBoundingClientRect();
          const dir = e.clientX < r.left + r.width / 2 ? 1 : -1;
          gsap.fromTo(t, { rotation: dir * 9 }, { rotation: 0, duration: 1.4, ease: "elastic.out(1, 0.3)", overwrite: true });
        };
        t.addEventListener("pointerenter", swing);
        return () => t.removeEventListener("pointerenter", swing);
      });
      return () => cleanups.forEach((c) => c());
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="dark" aria-labelledby="result-title">
      <div className="wrap">
        <header className={styles.head}>
          <h2 id="result-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        <ul className={styles.rack} data-rack>
          {data.tags.map((t) => (
            <li key={t.label} className={styles.slot}>
              <div className={styles.tag} data-tag data-long={t.value.length > 6 || undefined}>
                <span className={styles.hole} aria-hidden="true" />
                <b>{t.value}</b>
                <span>{t.label}</span>
                <small>{t.from}</small>
              </div>
            </li>
          ))}
        </ul>

        <ul className={styles.channels}>
          {data.channels.map((c) => (
            <li key={c.name}>
              <h3>{c.name}</h3>
              <p>{c.text}</p>
            </li>
          ))}
        </ul>

        <ul className={styles.stack} aria-label="Стек">
          {data.stack.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>

        <div className={styles.cta}>
          <div className={styles.form}>
            <p className={styles.ctaTitle}>Сделаем магазин в Telegram для вашего каталога</p>
            <HeroLead source="service" service={`Кейс ${client}`} cta={data.cta} />
          </div>
          <nav className={styles.more} aria-label="Другие дела">
            {others.map((o) => (
              <Link key={o.href} href={o.href}>
                {o.text}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </section>
  );
}
