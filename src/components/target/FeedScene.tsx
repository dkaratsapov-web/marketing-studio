"use client";

import { forwardRef } from "react";
import { gsap } from "gsap";
import type { TARGET } from "@/content/target";
import styles from "./FeedScene.module.css";

type Feed = (typeof TARGET)["feed"];

/** Посты ленты вокруг нашего объявления: только силуэты, чтобы не изображать чужие бренды */
const POSTS = [
  { h: 0.9, tone: 1 },
  { h: 0.6, tone: 2 },
  { h: 1.1, tone: 3 },
  { h: 0.75, tone: 1 },
  { h: 0.95, tone: 2 },
];
const AD_AT = 4;

/**
 * Шаги сцены: лента несётся вверх и тормозит ровно на нашем объявлении, шкала «скорости ленты»
 * падает до нуля, палец жмёт «Записаться», снизу выезжает форма, поля заполняются, «+1 заявка»
 * улетает в счётчик. Всё обратимо (без call), поэтому одну и ту же последовательность можно
 * и проигрывать по времени, и вести скроллом.
 */
export function addFeedSteps(
  tl: gsap.core.Timeline,
  root: HTMLElement,
  feed: Feed,
) {
  const q = (part: string) =>
    root.querySelector<HTMLElement>(`[data-part="${part}"]`)!;
  const screen = q("screen");
  const list = q("list");
  const ad = q("ad");
  const finger = q("finger");
  const sheet = q("sheet");
  const name = q("name");
  const phone = q("phone");
  const done = q("done");
  const pill = q("pill");
  const count = q("count");
  const gauge = q("gauge");
  const fill = q("fill");

  // Координаты в системе сцены с поправкой на её масштаб
  const at = (el: Element, dx = 0.5, dy = 0.5) => {
    const s = root.getBoundingClientRect();
    const k = s.width / root.offsetWidth || 1;
    const r = el.getBoundingClientRect();
    return {
      x: (r.left - s.left + r.width * dx) / k,
      y: (r.top - s.top + r.height * dy) / k,
    };
  };
  const stopY = () =>
    -(ad.offsetTop - (screen.clientHeight - ad.offsetHeight) / 2);
  const typed = { n: 0, p: 0 };
  const flags = { stop: 0, sent: 0, lead: 0 };
  const sync = () => {
    gauge.toggleAttribute("data-stop", flags.stop > 0.5);
    root.toggleAttribute("data-sent", flags.sent > 0.5);
    count.textContent = flags.lead > 0.5 ? "1" : "0";
  };

  tl.set(list, { y: 0 })
    .set(fill, { scaleY: 1 })
    .set(root, { "--lit": 0 })
    .set([finger, pill, done], { autoAlpha: 0 })
    .set(sheet, { yPercent: 105, autoAlpha: 1 })
    // 1. Лента: быстро вверх и резкое торможение на объявлении
    .to(list, { y: stopY, duration: 2.2, ease: "power4.out" })
    .to(fill, { scaleY: 0.03, duration: 2.2, ease: "power4.out" }, "<")
    .to(flags, { stop: 1, duration: 0.05, onUpdate: sync }, "-=0.35")
    .to(root, { "--lit": 1, duration: 0.4 }, "-=0.3")
    // 2. Касание кнопки
    .set(finger, { x: () => at(q("cta")).x, y: () => at(q("cta")).y + 60 })
    .to(
      finger,
      {
        autoAlpha: 1,
        y: () => at(q("cta")).y,
        duration: 0.45,
        ease: "power3.out",
      },
      "+=0.15",
    )
    .to(finger, { scale: 0.8, duration: 0.1, yoyo: true, repeat: 1 })
    .to(q("cta"), { scale: 0.95, duration: 0.1, yoyo: true, repeat: 1 }, "<")
    .to(finger, { autoAlpha: 0, duration: 0.2 })
    // 3. Форма записи снизу экрана
    .to(sheet, { yPercent: 0, duration: 0.55, ease: "power3.out" }, "<")
    .to(typed, {
      n: feed.form.name.length,
      duration: 0.4,
      ease: "none",
      onUpdate: () => {
        name.textContent = feed.form.name.slice(0, Math.round(typed.n));
      },
    })
    .to(typed, {
      p: feed.form.phone.length,
      duration: 0.7,
      ease: "none",
      onUpdate: () => {
        phone.textContent = feed.form.phone.slice(0, Math.round(typed.p));
      },
    })
    .to(
      q("submit"),
      { scale: 0.95, duration: 0.1, yoyo: true, repeat: 1 },
      "+=0.1",
    )
    .to(flags, { sent: 1, duration: 0.05, onUpdate: sync })
    .to(done, { autoAlpha: 1, duration: 0.3 }, "<")
    // 4. Заявка улетает в счётчик
    .set(pill, {
      xPercent: -50,
      yPercent: -50,
      x: () => at(sheet).x,
      y: () => at(sheet).y,
      scale: 0.7,
    })
    .to(pill, { autoAlpha: 1, scale: 1, duration: 0.25, ease: "back.out(2)" })
    .to(
      pill,
      {
        x: () => at(count).x,
        y: () => at(count).y,
        duration: 0.7,
        ease: "power3.in",
      },
      "+=0.1",
    )
    .to(pill, { autoAlpha: 0, scale: 0.6, duration: 0.15 })
    .to(flags, { lead: 1, duration: 0.05, onUpdate: sync }, "<")
    .fromTo(
      count,
      { scale: 1.35 },
      {
        scale: 1,
        duration: 0.45,
        ease: "back.out(2.4)",
        immediateRender: false,
      },
      "<",
    );
  return tl;
}

/** Телефон с лентой, шкала скорости ленты и счётчик заявок */
const FeedScene = forwardRef<HTMLDivElement, { feed: Feed }>(function FeedScene(
  { feed },
  ref,
) {
  const { ad, form, speed } = feed;
  return (
    <div ref={ref} className={styles.scene} data-scene aria-hidden="true">
      <div className={styles.gauge} data-part="gauge">
        <span className={styles.gaugeTrack}>
          <span className={styles.gaugeFill} data-part="fill" />
        </span>
        <span className={styles.gaugeLabel}>
          <span className={styles.moving}>{speed.moving}</span>
          <span className={styles.stopped}>{speed.stopped}</span>
        </span>
      </div>

      <div className={styles.phone}>
        <div className={styles.notch} />
        <div className={styles.screen} data-part="screen">
          <div className={styles.list} data-part="list">
            {[
              ...POSTS.slice(0, AD_AT),
              null,
              ...POSTS.slice(AD_AT),
              ...POSTS.slice(0, 2),
            ].map((p, i) =>
              p ? (
                <div key={i} className={styles.post} data-tone={p.tone}>
                  <span className={styles.postHead}>
                    <span className={styles.ava} />
                    <span
                      className={styles.bar}
                      style={{ width: `${40 + p.tone * 10}%` }}
                    />
                  </span>
                  <span
                    className={styles.media}
                    style={{ aspectRatio: `1 / ${p.h}` }}
                  />
                  <span className={styles.bar} style={{ width: "90%" }} />
                  <span className={styles.bar} style={{ width: "62%" }} />
                </div>
              ) : (
                <article key="ad" className={styles.ad} data-part="ad">
                  <span className={styles.postHead}>
                    <span className={`${styles.ava} ${styles.adAva}`} />
                    <span className={styles.adWho}>
                      {ad.who}
                      <span className={styles.adBadge}>{ad.badge}</span>
                    </span>
                  </span>
                  <span className={styles.adPhoto}>
                    <span>{ad.photo}</span>
                  </span>
                  <span className={styles.adTitle}>{ad.title}</span>
                  <span className={styles.adText}>{ad.text}</span>
                  <span className={styles.adCta} data-part="cta">
                    {ad.cta}
                  </span>
                </article>
              ),
            )}
          </div>

          {/* Форма записи выезжает снизу, как лид-форма внутри соцсети */}
          <div className={styles.sheet} data-part="sheet">
            <span className={styles.sheetHandle} />
            <span className={styles.sheetTitle}>{form.title}</span>
            <span className={styles.field}>
              <span className={styles.fieldLabel}>Имя</span>
              <span className={styles.fieldValue} data-part="name" />
            </span>
            <span className={styles.field}>
              <span className={styles.fieldLabel}>Телефон</span>
              <span className={styles.fieldValue} data-part="phone" />
            </span>
            <span className={styles.submit} data-part="submit">
              {form.submit}
            </span>
            <span className={styles.done} data-part="done">
              ✓ {form.done}
            </span>
          </div>
        </div>
      </div>

      <p className={styles.counter}>
        <span className={styles.counterLabel}>Заявки</span>
        <span className={styles.counterValue} data-part="count">
          0
        </span>
      </p>

      <span className={styles.finger} data-part="finger" />
      <span className={styles.pill} data-part="pill">
        +1 заявка
      </span>
    </div>
  );
});

export default FeedScene;
