"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { WEB } from "@/content/web";
import styles from "./PathDuel.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Data = (typeof WEB)["path"];
type Site = Data["sites"][number];

/** Куда прокручен экран на каждом шаге: доля от высоты экрана (содержимое в два экрана) */
const SCROLL = [0, 0, 0.25, 0.75, 1];

/**
 * Один и тот же человек на двух сайтах. Блок держится, пока его прокручивают: оба телефона
 * листаются вместе, палец посетителя останавливается на заголовке, цене, вопросах и форме,
 * а в списках рядом отмечается, что он увидел. На визитке он уходит к конкуренту,
 * на сайте под заявки оставляет заявку. Всё ведётся скроллом в обе стороны.
 */
export default function PathDuel({ data }: { data: Data }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current!;
      const phones = el.querySelectorAll<HTMLElement>("[data-phone]");
      const lists = el.querySelectorAll<HTMLElement>("[data-list]");
      const v = { s: 0, k: 0, end: 0 };
      const render = () => {
        const step = Math.min(4, Math.floor(v.k + 0.001));
        phones.forEach((ph) => {
          ph.dataset.step = String(step);
          ph.style.setProperty("--s", v.s.toFixed(4));
          ph.style.setProperty("--end", v.end.toFixed(3));
          ph.toggleAttribute("data-end", v.end > 0.5);
        });
        lists.forEach((l) => {
          l.querySelectorAll("li").forEach((li, i) => li.toggleAttribute("data-on", i < step));
          l.parentElement!.toggleAttribute("data-end", v.end > 0.5);
        });
      };

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        Object.assign(v, { s: 0, k: 4, end: 1 });
        render();
        return;
      }
      render();
      const tl = gsap.timeline({
        defaults: { ease: "none", onUpdate: render },
        scrollTrigger: { trigger: el.querySelector("[data-track]"), start: "top top", end: "bottom bottom", scrub: 0.6 },
      });
      tl.to({}, { duration: 0.3 }).to(v, { k: 1, duration: 0.3 });
      for (let k = 2; k <= 4; k++) {
        tl.to(v, { s: SCROLL[k], duration: 0.8, ease: "power1.inOut" }, "+=0.4").to(v, { k, duration: 0.3 });
      }
      tl.to(v, { end: 1, duration: 0.6 }, "+=0.4").to({}, { duration: 0.4 });
    },
    { scope: root },
  );

  const [card, seller] = data.sites;

  return (
    <section ref={root} className={styles.section} data-surface="light" aria-labelledby="path-title">
      <div className={styles.track} data-track>
        <div className={`wrap ${styles.sticky}`}>
          <header className={styles.head}>
            <h2 id="path-title" className={styles.title}>
              {data.title}
              <span className={styles.dotMark}>.</span>
            </h2>
            <p className={styles.lead}>{data.lead}</p>
            <p className={styles.query}>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <circle cx="8.5" cy="8.5" r="5.5" />
                <path d="m13 13 4.5 4.5" />
              </svg>
              {data.query}
            </p>
          </header>

          <div className={styles.duel}>
            <Checklist site={card} />
            <Phone site={card} data={data} />
            <Phone site={seller} data={data} />
            <Checklist site={seller} />
          </div>
          <p className={styles.note}>{data.note}</p>
        </div>
      </div>
    </section>
  );
}

/** Что посетитель увидел на сайте: пункты отмечаются по мере прокрутки */
function Checklist({ site }: { site: Site }) {
  return (
    <div className={styles.check} data-kind={site.key}>
      <p className={styles.siteName}>{site.name}</p>
      <ol className={styles.steps} data-list>
        {site.steps.map((s) => (
          <li key={s.text} data-ok={s.ok || undefined}>
            <span className={styles.mark} aria-hidden="true">
              {s.ok ? (
                <svg viewBox="0 0 16 16">
                  <path d="m3 8.5 3.2 3L13 4.5" />
                </svg>
              ) : (
                <svg viewBox="0 0 16 16">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              )}
            </span>
            {s.text}
          </li>
        ))}
      </ol>
      <p className={styles.endLine} data-kind={site.key}>
        {site.end}
      </p>
    </div>
  );
}

/** Телефон с условным сайтом: экран листается через --s, нужный блок подсвечивается по шагу */
function Phone({ site, data }: { site: Site; data: Data }) {
  const seller = site.key === "seller";
  return (
    <div className={styles.phone} data-phone data-kind={site.key} data-step="0" aria-hidden="true">
      <div className={styles.bar}>
        <span className={styles.url}>{seller ? "проектирование-под-ключ.рф/proektirovanie/sklada/" : "stroygrupp.ru"}</span>
      </div>
      <div className={styles.screen}>
        <div className={styles.page}>
          {/* 1. Первый экран */}
          <div className={styles.sec} data-sec="1">
            <div className={styles.nav}>
              <b>{site.brand}</b>
              {seller ? <span className={styles.navCta}>Оставить заявку</span> : <span className={styles.burger} />}
            </div>
            {seller ? (
              <>
                <p className={styles.h1}>{site.hero}</p>
                <p className={styles.sub}>{site.sub}</p>
              </>
            ) : (
              <div className={styles.banner}>
                <p className={styles.h1}>{site.hero}</p>
                <p className={styles.sub}>{site.sub}</p>
              </div>
            )}
          </div>

          {/* 2. Цена */}
          <div className={styles.sec} data-sec="2">
            {seller ? (
              <div className={styles.calc}>
                <p className={styles.secTitle}>{site.price}</p>
                <span className={styles.slider} style={{ "--v": 0.62 } as React.CSSProperties} />
                <span className={styles.slider} style={{ "--v": 0.35 } as React.CSSProperties} />
                <span className={styles.bars}>
                  <span style={{ flex: 7 }} />
                  <span style={{ flex: 2 }} />
                  <span style={{ flex: 1 }} />
                </span>
              </div>
            ) : (
              <>
                <p className={styles.secTitle}>О компании</p>
                <span className={styles.lines}>
                  <span />
                  <span />
                  <span />
                </span>
                <p className={styles.callout}>{site.price}</p>
              </>
            )}
          </div>

          {/* 3. Вопросы */}
          <div className={styles.sec} data-sec="3">
            {seller ? (
              <>
                <p className={styles.secTitle}>Вопросы</p>
                {data.faq.map((q) => (
                  <p key={q} className={styles.faqRow}>
                    {q}
                    <span>+</span>
                  </p>
                ))}
              </>
            ) : (
              <>
                <p className={styles.secTitle}>Наши услуги</p>
                <span className={styles.tiles}>
                  <span />
                  <span />
                  <span />
                  <span />
                </span>
              </>
            )}
          </div>

          {/* 4. Форма */}
          <div className={styles.sec} data-sec="4">
            {seller ? (
              <div className={styles.form}>
                <span className={styles.field}>{data.form[0]}</span>
                <span className={styles.submit}>{data.form[1]}</span>
              </div>
            ) : (
              <div className={styles.longForm}>
                {data.longForm.map((f) => (
                  <span key={f} className={styles.smallField}>
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <span className={styles.finger} />
        <div className={styles.end}>
          {seller ? (
            <span className={styles.toast}>
              <i />
              {site.end}
            </span>
          ) : (
            <span className={styles.leave}>← {site.end}</span>
          )}
        </div>
      </div>
    </div>
  );
}
