"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { TARGET } from "@/content/target";
import { AvitoMark, TelegramMark, VkMark } from "./Marks";
import styles from "./Profile.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Props = { data: (typeof TARGET)["dossier"]; head: (typeof TARGET)["head"] };

const MARKS = [VkMark, TelegramMark, AvitoMark];

/**
 * Досье отдела как страница профиля в соцсети: обложка, аватар с кольцом историй,
 * описание, площадки и три закреплённых поста с принципами работы.
 * Когда блок появляется, профиль «загружается»: сначала серые заглушки строк,
 * затем текст проявляется сверху вниз, как подгружается страница в приложении.
 */
export default function Profile({ data, head }: Props) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current!;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      // Заглушки ставит только скрипт и только если профиль ещё ниже экрана: без JS текст виден сразу
      if (el.getBoundingClientRect().top < window.innerHeight * 0.8) return;
      el.dataset.wait = "";
      ScrollTrigger.create({
        trigger: el.querySelector(`.${styles.card}`),
        start: "top 75%",
        once: true,
        onEnter: () => {
          window.setTimeout(() => delete el.dataset.wait, 850);
        },
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="light" aria-labelledby="profile-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="profile-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.team}>{data.team}</p>
        </header>

        <article className={styles.card}>
          <div className={styles.cover} aria-hidden="true">
            {MARKS.map((M, i) => (
              <M key={i} className={styles.coverMark} />
            ))}
          </div>

          <div className={styles.top}>
            <span className={styles.ava} aria-hidden="true">
              <span className={styles.avaInner}>{data.initial}</span>
            </span>
            <div className={styles.names}>
              <h3 className={`${styles.name} ${styles.sk}`}>{head.name}</h3>
              <p className={`${styles.role} ${styles.sk}`}>
                {head.role} · {data.handle}
              </p>
            </div>
          </div>

          <p className={`${styles.about} ${styles.sk}`}>{data.about}</p>

          <ul className={styles.chips} aria-label="Площадки">
            {data.platforms.map((p, i) => {
              const M = MARKS[i];
              return (
                <li key={p} className={`${styles.chip} ${styles.sk}`}>
                  <M className={styles.chipMark} />
                  {p}
                </li>
              );
            })}
          </ul>

          <p className={styles.pinned}>{data.pinned}</p>
          <ol className={styles.posts}>
            {data.posts.map((p, i) => (
              <li key={p.title} className={styles.post} style={{ "--i": i } as React.CSSProperties}>
                <span className={styles.postAva} aria-hidden="true">
                  {data.initial}
                </span>
                <div className={styles.postBody}>
                  <h4 className={`${styles.postTitle} ${styles.sk}`}>{p.title}</h4>
                  <p className={`${styles.postText} ${styles.sk}`}>{p.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </article>
      </div>
    </section>
  );
}
