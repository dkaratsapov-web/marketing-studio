"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { IPAPA } from "@/content/ipapa";
import product from "@/assets/cases/ipapa/product-photo.webp";
import styles from "./PriceWatch.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof IPAPA)["bot"];

const rub = (n: number) => `${new Intl.NumberFormat("ru-RU").format(n)} ₽`;

/**
 * Подписка на цену в боте. Человек нажимает «Следить за ценой», время в чате проматывается,
 * сверху падает пуш, и бот присылает сообщение: цена снизилась, старая зачёркнута, новая
 * досчитывается. Сцена играет сама, когда появляется на экране, и повторяется по кнопке.
 * Все сообщения стоят на своих местах с самого начала, поэтому высота чата не меняется.
 */
export default function PriceWatch({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const [following, setFollowing] = useState(false);

  useGSAP(
    () => {
      const el = root.current!;
      const $ = (s: string) => el.querySelector<HTMLElement>(`[data-part="${s}"]`)!;
      const price = $("price");
      const v = { n: data.price };
      // Стартовый кадр ставим сразу: таймлайн на паузе его не отрисует
      gsap.set([$("skip"), $("alert"), $("push")], { autoAlpha: 0 });
      gsap.set($("push"), { yPercent: -130 });
      const t = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });
      t.set([$("skip"), $("alert"), $("push")], { autoAlpha: 0 })
        .set($("alert"), { y: 16, scale: 0.96 })
        .set($("push"), { yPercent: -130 })
        .set(v, { n: data.price })
        .call(() => setFollowing(false))
        .call(() => setFollowing(true), undefined, 0.6)
        .to($("follow"), { scale: 0.94, duration: 0.12, yoyo: true, repeat: 1 }, 0.5)
        .to($("skip"), { autoAlpha: 1, duration: 0.35 }, 1.3)
        .to($("push"), { autoAlpha: 1, yPercent: 0, duration: 0.55, ease: "back.out(1.4)" }, 2.1)
        .to($("alert"), { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, ease: "back.out(1.6)" }, 2.5)
        .to(v, { n: data.drop, duration: 1.1, ease: "power2.out", onUpdate: () => void (price.textContent = rub(Math.round(v.n / 10) * 10)) }, 2.8)
        .to($("push"), { autoAlpha: 0, yPercent: -130, duration: 0.45, ease: "power2.in" }, 4.6);
      tl.current = t;

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        // Без анимации: сразу итог, пуш спрятан, уведомление и цена на месте
        t.progress(1);
        price.textContent = rub(data.drop);
        return;
      }
      ScrollTrigger.create({ trigger: el.querySelector("[data-phone]"), start: "top 70%", once: true, onEnter: () => t.play(0) });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} data-surface="dark" aria-labelledby="bot-title">
      <div className={`wrap ${styles.grid}`}>
        <div className={styles.copy}>
          <h2 id="bot-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
          <div className={styles.admin}>
            <p className="label">{data.admin.title}</p>
            <ul>
              {data.admin.items.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <button type="button" className={styles.replay} onClick={() => tl.current?.play(0)}>
            Показать ещё раз
          </button>
        </div>

        <figure className={styles.phoneWrap}>
          <div className={styles.phone} data-phone>
            {/* Пуш сверху экрана */}
            <div className={styles.push} data-part="push" aria-hidden="true">
              <span className={styles.pushIco}>а</span>
              <span>
                <b>айпапа.рф</b>
                {data.alert}: {data.product}
              </span>
            </div>

            <div className={styles.bar}>
              <span className={styles.ava} aria-hidden="true">а</span>
              <span>
                <b>айпапа.рф</b>
                <small>{data.handle}, бот</small>
              </span>
            </div>

            <div className={styles.feed}>
              <div className={styles.card}>
                <div className={styles.photo}>
                  <Image src={product} alt={`${data.product} в мини-приложении`} className={styles.photoImg} sizes="16rem" />
                </div>
                <b>{data.product}</b>
                <span className={styles.cardPrice}>{rub(data.price)}</span>
                <button type="button" className={styles.follow} data-part="follow" data-on={following || undefined} onClick={() => tl.current?.play(0)}>
                  {following ? `✓ ${data.following}` : data.follow}
                </button>
              </div>

              <p className={styles.skip} data-part="skip">
                Через три дня
              </p>

              <div className={styles.alert} data-part="alert" role="status">
                <span className={styles.alertHead}>{data.alert}</span>
                <b>{data.product}</b>
                <span className={styles.prices}>
                  <s>{rub(data.price)}</s>
                  <b data-part="price">{rub(data.drop)}</b>
                </span>
                <span className={styles.alertBtn}>Открыть в магазине</span>
              </div>
            </div>
          </div>
          <figcaption className={styles.note}>{data.note}</figcaption>
        </figure>
      </div>
    </section>
  );
}
