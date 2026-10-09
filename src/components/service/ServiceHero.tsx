"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import HeroLead from "@/components/hero/HeroLead";
import { CONTEXT, type SearchQuery } from "@/content/services";
import SearchScene, { addQuerySteps, CINEMATIC_MQ, sceneParts } from "./SearchScene";
import styles from "./ServiceHero.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Props = {
  service: typeof CONTEXT;
  queries: SearchQuery[];
};

/**
 * Первый экран отдела. Как на главной, экран закрепляется и историю ведёт скролл,
 * но вместо монолита здесь поиск: заголовок «Ловим спрос.» уходит, строка поиска выезжает
 * в центр, запрос печатается в такт прокрутке (и проступает на фоне огромными контурными буквами),
 * собирается выдача, наше объявление горит, клик, «+1 заявка» в счётчик, и финал «Спрос пойман.».
 * На телефоне и невысоких экранах экран не закрепляется, а сцена крутится сама.
 */
export default function ServiceHero({ service, queries }: Props) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const section = root.current;
      if (!section || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const $ = (cls: string) => section.querySelector<HTMLElement>(`.${cls}`)!;
      const stage = $(styles.stage);
      const echo = $(styles.echo);
      const scene = section.querySelector<HTMLElement>("[data-scene]")!;

      const mm = gsap.matchMedia();

      mm.add(CINEMATIC_MQ, () => {
        const item = queries[0];
        const parts = sceneParts(scene);
        // Исходный кадр до прокрутки: пустой поиск, выдачи и подсветки нет
        parts.query.textContent = "";
        // Обычная выдача видна блёкло, как будто страница ждёт запроса; нашего объявления ещё нет
        gsap.set(parts.results, { autoAlpha: (i) => (i === 0 ? 0 : 0.22), y: 0 });
        // Явные стартовые значения: ScrollTrigger при пересчёте отматывает таймлайн к ним
        gsap.set([parts.pointer, parts.pill], { autoAlpha: 0 });
        gsap.set(scene, { "--lit": 0 });

        const wrap = stage.parentElement!;
        // Сцена лежит в правом нижнем углу своей колонки уменьшенной; считаем от рамки колонки,
        // она не трансформируется, поэтому расчёт не зависит от текущего масштаба сцены
        const small = () =>
          Math.min(0.78, (wrap.offsetHeight * 0.98) / stage.offsetHeight, wrap.offsetWidth / stage.offsetWidth);
        const corner = () => ({
          x: (stage.offsetWidth * (1 - small())) / 2,
          y: (stage.offsetHeight * (1 - small())) / 2,
        });
        const toCenter = () => {
          const r = wrap.getBoundingClientRect();
          return {
            x: window.innerWidth / 2 - (r.right - stage.offsetWidth / 2),
            y: window.innerHeight / 2 - (r.bottom - stage.offsetHeight / 2) + window.innerHeight * 0.03,
          };
        };
        const bigScale = () => Math.min(1.12, (window.innerHeight * 0.8) / stage.offsetHeight);

        gsap.set(stage, { scale: small, x: () => corner().x, y: () => corner().y, autoAlpha: 1 });

        const tl = gsap.timeline({
          defaults: { ease: "power2.inOut" },
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "+=260%",
            pin: true,
            scrub: 0.8,
            invalidateOnRefresh: true,
          },
        });

        // 1. Заголовок и текст уходят вверх, сцена выезжает в центр и растёт
        tl.to([$(styles.top), $(styles.title), $(styles.leadOuter)], {
          yPercent: -40,
          autoAlpha: 0,
          duration: 1,
          stagger: 0.08,
        })
          .to($(styles.hint), { autoAlpha: 0, duration: 0.3 }, 0)
          .to(stage, { x: () => toCenter().x, y: () => toCenter().y, scale: bigScale, duration: 1.2 }, 0.1)
          .to(echo, { autoAlpha: 1, duration: 0.6 }, 0.9);

        // 2. Сам поиск: те же шаги, что и в автоматическом цикле, но в такт скроллу
        const steps = gsap.timeline({ defaults: { ease: "power2.out" } });
        addQuerySteps(steps, scene, item, {
          onType: (text) => {
            echo.textContent = text;
          },
        });
        tl.add(steps, 1.3);

        // Огромный контурный запрос медленно уезжает влево, пока идёт набор
        tl.fromTo(
          echo,
          { x: 0 },
          { x: () => Math.min(0, window.innerWidth - echo.scrollWidth - 80), ease: "none", duration: steps.duration() },
          1.3,
        );

        // 3. Финал: сцена отходит вправо, слева встаёт «Спрос пойман.»
        tl.to(stage, { x: () => toCenter().x + window.innerWidth * 0.2, scale: () => bigScale() * 0.78, duration: 1 }, "+=0.3")
          .to(echo, { autoAlpha: 0, duration: 0.5 }, "<")
          .fromTo(
            section.querySelectorAll(`.${styles.finaleLine}`),
            { yPercent: 110 },
            { yPercent: 0, duration: 0.9, stagger: 0.12, ease: "power3.out" },
            "<0.2",
          )
          .fromTo($(styles.finaleNote), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.6 }, "<0.4")
          .to({}, { duration: 0.6 });

        // Строки финала уже спрятаны под маску стартовыми значениями fromTo, теперь контейнер можно показать
        gsap.set($(styles.finale), { autoAlpha: 1 });
      });

      // Телефон и невысокие экраны: без закрепления, сцена только чуть приподнимается при скролле
      mm.add(`not all and ${CINEMATIC_MQ}`, () => {
        gsap.to(stage, {
          yPercent: -5,
          ease: "none",
          scrollTrigger: { trigger: stage, start: "top bottom", end: "bottom top", scrub: 0.6 },
        });
      });
    },
    { scope: root, dependencies: [queries] },
  );

  return (
    <section ref={root} id="top" className={styles.hero} data-surface="dark">
      <div className={styles.grain} aria-hidden="true" />
      <div className={styles.glow} aria-hidden="true" />
      <p className={styles.echo} aria-hidden="true" />

      <div className={`wrap ${styles.grid}`}>
        <div className={styles.top}>
          <nav className={styles.crumbs} aria-label="Хлебные крошки">
            <Link href="/">Корпорация</Link>
            <span aria-hidden="true">/</span>
            <Link href="/#departments">Отделы</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{service.name}</span>
          </nav>
          <p className={`label ${styles.kicker}`}>
            {service.department} <span className={styles.kickerTools}>· {service.tools}</span>
          </p>
          <p className={styles.hint} aria-hidden="true">
            <span className={styles.hintDot} />
            Прокрутите: человек начинает поиск
          </p>
        </div>

        <h1 className={styles.title}>
          <span className="visually-hidden">{service.name}: </span>
          {service.title.map((word, i) => (
            <span key={word} className={styles.mask}>
              <span className={styles.line} style={{ "--i": i } as React.CSSProperties}>
                {word}
                {i === service.title.length - 1 ? <span className={styles.dot}>.</span> : null}
              </span>
            </span>
          ))}
        </h1>

        <div className={styles.leadOuter}>
          <div className={styles.lead}>
            <p className={styles.leadText}>{service.lead}</p>
            <HeroLead source="service" service={service.name} />
            <dl className={styles.facts}>
              {service.facts.map((f) => (
                <div key={f.label} className={styles.fact}>
                  <dt className={styles.factLabel}>{f.label}</dt>
                  <dd className={styles.factValue}>{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className={styles.stageWrap}>
          <div className={styles.stage}>
            <SearchScene queries={queries} />
          </div>
        </div>

        {/* Финальный кадр сцены: заголовок договаривается до результата */}
        <p className={styles.finale} aria-hidden="true">
          <span className={styles.finaleMask}>
            <span className={styles.finaleLine}>Спрос</span>
          </span>
          <span className={styles.finaleMask}>
            <span className={styles.finaleLine}>
              пойман<span className={styles.dot}>.</span>
            </span>
          </span>
          <span className={styles.finaleNote}>
            Человек искал. Нашёл вас. Оставил заявку.
            <br />
            Так работает отдел каждый день.
          </span>
        </p>
      </div>
    </section>
  );
}
