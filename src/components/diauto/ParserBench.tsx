"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import type { DIAUTO } from "@/content/diauto";
import styles from "./ParserBench.module.css";

gsap.registerPlugin(useGSAP);

type Data = (typeof DIAUTO)["parser"];

/** Режем текст поста на куски: распознанные поля и обычный текст между ними */
function segments(post: string, marks: string[]) {
  const out: { text: string; mark?: number }[] = [];
  let at = 0;
  marks.forEach((m, i) => {
    const k = post.indexOf(m, at);
    if (k < 0) return;
    if (k > at) out.push({ text: post.slice(at, k) });
    out.push({ text: m, mark: i });
    at = k + m.length;
  });
  if (at < post.length) out.push({ text: post.slice(at) });
  return out;
}

/**
 * Разбор поста канала. Слева пост: распознанные куски подсвечиваются по очереди, и в тот же
 * момент справа заполняется строка таблицы полей. В конце результат: карточка встаёт
 * в каталог, или проверка ловит цену с потерянным нулём и ставит штамп, или пост «продано»
 * снимает карточку с витрины. Сценарий переключается вкладками и проигрывается заново.
 */
export default function ParserBench({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);
  const [s, setS] = useState(0);
  const [armed, setArmed] = useState(false);
  const sc = data.scenarios[s];

  useEffect(() => {
    // Старт, когда верх секции проходит 80% экрана: порог в процентах высоты на телефоне запаздывал
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && setArmed(true), { rootMargin: "0px 0px -20% 0px" });
    io.observe(root.current!);
    return () => io.disconnect();
  }, []);

  useGSAP(
    () => {
      const el = root.current!;
      const marks = el.querySelectorAll<HTMLElement>("[data-mark]");
      const rows = [...el.querySelectorAll<HTMLElement>("[data-row]")];
      const filled = rows.filter((r) => r.dataset.filled === "1");
      const status = el.querySelector<HTMLElement>("[data-status]")!;
      const card = el.querySelector<HTMLElement>("[data-card]")!;
      const result = el.querySelector<HTMLElement>("[data-result]")!;
      const stamp = el.querySelector<HTMLElement>("[data-stamp]");
      const strike = el.querySelector<HTMLElement>("[data-strike]");
      const price = el.querySelector<HTMLElement>("[data-row='price']");

      const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.out" } });
      tl.set(marks, { "--hl": 0 })
        .set([...rows, status], { autoAlpha: 0, x: -10 })
        .set(card, { autoAlpha: 0, scale: 0.85, x: 0, filter: "grayscale(0) blur(0px)" })
        .set(result, { autoAlpha: 0, y: 8 });
      if (stamp) tl.set(stamp, { autoAlpha: 0, scale: 2.2, rotation: -4 });
      if (strike) tl.set(strike, { scaleX: 0 });
      if (price) tl.set(price, { "--bad": 0 });

      // Поле за полем: подсветка в посте и строка в таблице
      marks.forEach((m, i) => {
        const row = filled[i] ?? status;
        tl.to(m, { "--hl": 1, duration: 0.28 }, i ? "+=0.08" : 0.2).to(row, { autoAlpha: 1, x: 0, duration: 0.28 }, "<+0.1");
      });
      tl.to(
        rows.filter((r) => r.dataset.filled !== "1"),
        { autoAlpha: 1, x: 0, duration: 0.25 },
        "+=0.05",
      ).to(status, { autoAlpha: 1, x: 0, duration: 0.25 }, "<");

      if (sc.key === "new") {
        tl.to(card, { autoAlpha: 1, scale: 1, duration: 0.6, ease: "back.out(1.6)" }, "+=0.15");
      } else if (sc.key === "typo") {
        tl.to(price, { "--bad": 1, duration: 0.3 }, "+=0.1")
          .to(card, { autoAlpha: 0.6, scale: 1, filter: "grayscale(1) blur(3px)", duration: 0.5 })
          .to(stamp, { autoAlpha: 1, scale: 1, rotation: -12, duration: 0.35, ease: "power4.in" }, "-=0.1");
      } else {
        tl.to(card, { autoAlpha: 1, scale: 1, duration: 0.5 }, "+=0.1")
          .to(strike, { scaleX: 1, duration: 0.35, ease: "power3.inOut" }, "+=0.2")
          .to(card, { filter: "grayscale(1) blur(0px)", duration: 0.3 }, "<")
          .to(card, { x: 40, autoAlpha: 0.18, duration: 0.6, ease: "power2.in" }, "+=0.4");
      }
      tl.to(result, { autoAlpha: 1, y: 0, duration: 0.35 }, "-=0.1");

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) tl.progress(1);
      else if (armed) tl.play();
      return () => tl.kill();
    },
    { scope: root, dependencies: [s, armed], revertOnUpdate: true },
  );

  const segs = segments(sc.post, sc.marks);

  return (
    <section ref={root} className={styles.section} data-surface="dark" aria-labelledby="parser-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="parser-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        <div className={styles.tabs} role="group" aria-label="Сценарий">
          {data.scenarios.map((x, i) => (
            <button key={x.key} type="button" className={styles.tab} aria-pressed={i === s} onClick={() => setS(i)}>
              {x.name}
            </button>
          ))}
        </div>

        <div className={styles.bench}>
          {/* Пост канала */}
          <div className={styles.post}>
            <span className={styles.channel}>
              <i aria-hidden="true" />
              ДиАвто69
            </span>
            <p className={styles.postText}>
              {segs.map((g, i) =>
                g.mark === undefined ? (
                  <span key={i}>{g.text}</span>
                ) : (
                  <mark key={i} className={styles.mark} data-mark>
                    {g.text}
                  </mark>
                ),
              )}
            </p>
          </div>

          <span className={styles.arrow} aria-hidden="true">
            →
          </span>

          {/* Поля, которые распознал механизм */}
          <dl className={styles.fields}>
            {data.fields.map((f) => {
              const v = f.values[s];
              return (
                <div key={f.key} className={styles.row} data-row={f.key} data-filled={v ? "1" : undefined}>
                  <dt>{f.label}</dt>
                  <dd data-empty={!v || undefined}>{v || "нет"}</dd>
                </div>
              );
            })}
            <div className={`${styles.row} ${styles.statusRow}`} data-status data-kind={sc.key}>
              <dt>{data.statusLabel}</dt>
              <dd>{sc.status}</dd>
            </div>
          </dl>

          {/* Результат */}
          <div className={styles.out}>
            <div className={styles.cardWrap}>
              <div className={styles.card} data-card data-kind={sc.key}>
                <Image src={data.cards[sc.key as keyof typeof data.cards]} alt="" className={styles.cardImg} sizes="(max-width: 960px) 60vw, 18vw" />
                {sc.key === "sold" ? <span className={styles.strike} data-strike>Продано</span> : null}
              </div>
              {sc.key === "typo" ? (
                <span className={styles.stamp} data-stamp>
                  Не публикуем
                </span>
              ) : null}
            </div>
            <p className={styles.result} data-result data-kind={sc.key} aria-live="polite">
              {sc.result}
            </p>
          </div>
        </div>
        <p className={styles.note}>{data.note}</p>
      </div>
    </section>
  );
}
