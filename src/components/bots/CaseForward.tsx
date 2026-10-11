"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { BOTS } from "@/content/bots";
import styles from "./CaseForward.module.css";

type Data = (typeof BOTS)["cases"];

/**
 * Дела как пересланные сообщения: у каждого снимок мини-приложения, текст и кнопки
 * под сообщением, как у бота. Когда блок въезжает в экран, сообщения приходят по
 * одному и у каждого загораются две галочки «прочитано».
 */
export default function CaseForward({ data }: { data: Data }) {
  const list = useRef<HTMLOListElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = list.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => {
        if (es[es.length - 1].isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className={styles.section} data-surface="light" aria-labelledby="forward-title">
      <div className="wrap">
        <h2 id="forward-title" className={styles.title}>
          {data.title}
          <span className={styles.dotMark}>.</span>
        </h2>

        <ol ref={list} className={styles.list} data-on={on || undefined}>
          {data.items.map((c, i) => (
            <li key={c.code} className={styles.item} style={{ "--i": i } as React.CSSProperties}>
              <article className={styles.msg}>
                <p className={styles.from}>
                  Переслано из дела {c.code}
                  <b>{c.name}</b>
                </p>
                <div className={styles.shot}>
                  <Image src={c.img} alt={`Мини-приложение ${c.name}`} sizes="(max-width: 860px) 80vw, 24vw" className={styles.img} />
                </div>
                <p className={styles.text}>{c.text}</p>
                <span className={styles.ticks} aria-hidden="true">
                  <svg viewBox="0 0 22 12" fill="none">
                    <path d="M1 6.5 5 10.5 13 1.5" />
                    <path d="M9 10.5 17 1.5" />
                  </svg>
                </span>
              </article>
              {/* Кнопки под сообщением, как инлайн-клавиатура бота */}
              <ul className={styles.keys}>
                {c.facts.map((f) => (
                  <li key={f} className={styles.fact}>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href={c.href} className={styles.open}>
                Открыть дело {c.code}
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
