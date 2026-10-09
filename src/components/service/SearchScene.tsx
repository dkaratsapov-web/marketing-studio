"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { SearchQuery } from "@/content/services";
import styles from "./SearchScene.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Props = { queries: SearchQuery[] };

/**
 * Живая сцена первого экрана «Контекста»: человек вводит запрос, собирается выдача,
 * наше объявление стоит первым и подсвечено, по нему кликают, и «+1 заявка» уходит в счётчик.
 * Это иллюстрация механики, а не данные: примеры запросов взяты из наших дел.
 */
export default function SearchScene({ queries }: Props) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const q = <T extends Element>(s: string) => el.querySelector<T>(s)!;
      const query = q<HTMLSpanElement>(`.${styles.query}`);
      const results = el.querySelectorAll<HTMLElement>(`.${styles.result}`);
      const ad = q<HTMLElement>(`.${styles.ad}`);
      const adTitle = q<HTMLElement>(`.${styles.adTitle}`);
      const adWho = q<HTMLElement>(`.${styles.adWho}`);
      const adText = q<HTMLElement>(`.${styles.adText}`);
      const caseCode = q<HTMLElement>(`.${styles.caseCode}`);
      const pointer = q<HTMLElement>(`.${styles.pointer}`);
      const pill = q<HTMLElement>(`.${styles.pill}`);
      const count = q<HTMLElement>(`.${styles.countValue}`);
      const enter = q<HTMLElement>(`.${styles.enter}`);

      const fill = (item: SearchQuery) => {
        adTitle.textContent = item.ad.title;
        adWho.textContent = item.ad.who;
        adText.textContent = item.ad.text;
        caseCode.textContent = item.caseCode;
      };

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        // Статичный кадр: запрос набран, выдача собрана, объявление подсвечено
        const item = queries[0];
        query.textContent = item.query;
        query.parentElement!.scrollLeft = query.parentElement!.scrollWidth;
        fill(item);
        el.dataset.state = "lit";
        count.textContent = "1";
        return;
      }

      // Где на сцене центр объявления и счётчика: для курсора и летящей заявки
      const at = (target: Element, dx = 0.5, dy = 0.5) => {
        const s = el.getBoundingClientRect();
        const r = target.getBoundingClientRect();
        return { x: r.left - s.left + r.width * dx, y: r.top - s.top + r.height * dy };
      };

      let leads = 0;
      const master = gsap.timeline({ repeat: -1, paused: true });

      queries.forEach((item) => {
        const tl = gsap.timeline();
        const typed = { n: 0 };

        tl.call(() => {
          fill(item);
          query.textContent = "";
          el.dataset.state = "typing";
        })
          .set(results, { autoAlpha: 0, y: 14 })
          .set(pointer, { autoAlpha: 0, x: () => el.clientWidth * 0.82, y: () => el.clientHeight * 0.92 })
          // Запрос печатается с ровным темпом живого набора
          .to(typed, {
            n: item.query.length,
            duration: item.query.length * 0.045,
            ease: "none",
            onUpdate: () => {
              query.textContent = item.query.slice(0, Math.round(typed.n));
              // Как в настоящем поле: длинный запрос сдвигается, курсор остаётся на виду
              query.parentElement!.scrollLeft = query.parentElement!.scrollWidth;
            },
          })
          .to(enter, { scale: 0.92, duration: 0.09, yoyo: true, repeat: 1, ease: "power2.out" }, "+=0.15")
          .call(() => {
            el.dataset.state = "results";
          })
          // Выдача собирается сверху вниз, наше объявление первое
          .to(results, { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.07, ease: "power3.out" })
          .call(() => {
            el.dataset.state = "lit";
          }, undefined, "-=0.1")
          // Курсор идёт к объявлению и кликает
          .to(pointer, { autoAlpha: 1, duration: 0.2 }, "+=0.35")
          .to(pointer, { x: () => at(ad, 0.62, 0.55).x, y: () => at(ad, 0.62, 0.55).y, duration: 0.75, ease: "power3.inOut" }, "<")
          .to(pointer, { scale: 0.82, duration: 0.08, yoyo: true, repeat: 1, ease: "power2.out" })
          .to(ad, { scale: 0.985, duration: 0.08, yoyo: true, repeat: 1, ease: "power2.out" }, "<")
          // Заявка летит из объявления в счётчик
          .set(pill, { xPercent: -50, yPercent: -50, x: () => at(ad, 0.62, 0.55).x, y: () => at(ad, 0.62, 0.55).y, autoAlpha: 0, scale: 0.7 })
          .to(pill, { autoAlpha: 1, scale: 1, duration: 0.25, ease: "back.out(2)" })
          .to(pill, {
            x: () => at(count, 0.5, 0.5).x,
            y: () => at(count, 0.5, 0.5).y,
            duration: 0.75,
            ease: "power3.in",
          }, "+=0.15")
          .to(pill, { autoAlpha: 0, scale: 0.6, duration: 0.15 })
          .call(() => {
            leads += 1;
            count.textContent = String(leads);
          }, undefined, "<")
          .fromTo(count, { scale: 1.25 }, { scale: 1, duration: 0.45, ease: "back.out(2.4)" }, "<")
          .to(pointer, { autoAlpha: 0, duration: 0.25 }, "<")
          // Пауза на результат и уход выдачи
          .to(results, { autoAlpha: 0, y: -10, duration: 0.35, stagger: 0.04, ease: "power2.in" }, "+=1.3");

        master.add(tl);
      });

      // Цикл крутится, только пока сцена на экране
      ScrollTrigger.create({
        trigger: el,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => (self.isActive ? master.play() : master.pause()),
      });
    },
    { scope: root, dependencies: [queries] },
  );

  return (
    <div ref={root} className={styles.scene} data-state="idle" aria-hidden="true">
      <div className={styles.bar}>
        <svg className={styles.loupe} viewBox="0 0 20 20" fill="none">
          <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="m13 13 4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <span className={styles.queryWrap}>
          <span className={styles.query} />
          <span className={styles.caret} />
        </span>
        <span className={styles.enter}>Найти</span>
      </div>

      <div className={styles.results}>
        <article className={`${styles.result} ${styles.ad}`}>
          <p className={styles.adMeta}>
            <span className={styles.adBadge}>Реклама</span>
            <span className={styles.adWho} />
          </p>
          <p className={styles.adTitle} />
          <p className={styles.adText} />
        </article>
        {[0.92, 0.78, 0.86].map((w, i) => (
          <div key={i} className={`${styles.result} ${styles.organic}`}>
            <span style={{ width: `${w * 60}%` }} />
            <span style={{ width: `${w * 100}%` }} />
            <span style={{ width: `${w * 72}%` }} />
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <p className={styles.caption}>
          Пример из дела <span className={styles.caseCode} />
        </p>
        <p className={styles.count}>
          <span className={styles.countLabel}>Заявки</span>
          <span className={styles.countValue}>0</span>
        </p>
      </div>

      <span className={styles.pill}>+1 заявка</span>
      <svg className={styles.pointer} viewBox="0 0 24 24">
        <path d="M5 3l14 8-6.2 1.6L10 19z" fill="#fff" stroke="#050505" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
