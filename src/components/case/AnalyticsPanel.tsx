"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { SFERA } from "@/content/sfera";
import { CINEMATIC_MQ } from "@/components/service/SearchScene";
import styles from "./AnalyticsPanel.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Props = { panel: (typeof SFERA)["panel"] };
type Step = Props["panel"]["steps"][number];

/** Сдвиг снимка, чтобы точка фокуса встала в центр окна, без выхода за края */
function aim(step: Step, frame: HTMLElement, img: HTMLElement) {
  const fw = frame.clientWidth;
  const fh = frame.clientHeight;
  const iw = img.offsetWidth * step.zoom;
  const ih = img.offsetHeight * step.zoom;
  const x = Math.min(0, Math.max(fw - iw, fw / 2 - step.fx * iw));
  const y = Math.min(0, Math.max(fh - ih, fh / 2 - step.fy * ih));
  return { x, y, scale: step.zoom };
}

/**
 * Собственная аналитика. Сверху вкладки панели, как в настоящем интерфейсе (все восемь),
 * ниже окно со снимком. На десктопе экран закреплён: по скроллу переключаются вкладки
 * «Обзор → Директ → SEO → Заявки», и на каждой камера сначала показывает экран целиком,
 * потом наезжает на главное место. Так снимок читается, хотя целиком он мелкий.
 * На телефоне вкладки идут друг под другом, каждая сразу в увеличенном кадре.
 */
export default function AnalyticsPanel({ panel }: Props) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const section = root.current!;
      const steps = gsap.utils.toArray<HTMLElement>(`.${styles.step}`);
      const frames = steps.map(
        (s) => s.querySelector<HTMLElement>(`.${styles.frame}`)!,
      );
      const imgs = steps.map(
        (s) => s.querySelector<HTMLElement>(`.${styles.img}`)!,
      );
      const tabs = gsap.utils.toArray<HTMLElement>(`.${styles.tab}`);
      const marker = section.querySelector<HTMLElement>(`.${styles.marker}`)!;
      const tabOf = (i: number) => tabs[panel.tabs.indexOf(panel.steps[i].tab)];

      const mm = gsap.matchMedia();
      mm.add(
        // Второе условие нужно, чтобы колбэк запускался и тогда, когда сцена не закрепляется
        {
          cine: `${CINEMATIC_MQ} and (prefers-reduced-motion: no-preference)`,
          flat: `not all and ${CINEMATIC_MQ} and (prefers-reduced-motion: no-preference)`,
          still: "(prefers-reduced-motion: reduce)",
        },
        (ctx) => {
          if (!ctx.conditions!.cine) {
            // Без закрепления: каждая вкладка сразу в увеличенном кадре
            const place = () =>
              imgs.forEach((img, i) =>
                gsap.set(img, aim(panel.steps[i], frames[i], img)),
              );
            place();
            window.addEventListener("resize", place);
            return () => window.removeEventListener("resize", place);
          }

          const markTo = (i: number) => ({
            x: tabOf(i).offsetLeft,
            width: tabOf(i).offsetWidth,
          });
          gsap.set(steps, { autoAlpha: (i) => (i === 0 ? 1 : 0) });
          gsap.set(imgs, { x: 0, y: 0, scale: 1, transformOrigin: "0 0" });
          gsap.set(marker, markTo(0));
          tabs.forEach((t) => t.removeAttribute("data-on"));
          tabOf(0).setAttribute("data-on", "");

          const tl = gsap.timeline({
            defaults: { ease: "power2.inOut" },
            scrollTrigger: {
              trigger: section.querySelector(`.${styles.stage}`),
              start: "top top",
              end: `+=${panel.steps.length * 90}%`,
              pin: true,
              scrub: 0.7,
              invalidateOnRefresh: true,
              onUpdate: (self) => {
                const i = Math.min(
                  panel.steps.length - 1,
                  Math.floor(self.progress * panel.steps.length * 0.999),
                );
                tabs.forEach((t) =>
                  t.toggleAttribute("data-on", t === tabOf(i)),
                );
              },
            },
          });

          panel.steps.forEach((step, i) => {
            const at = i * 2;
            if (i > 0) {
              tl.to(steps[i - 1], { autoAlpha: 0, duration: 0.3 }, at)
                .fromTo(
                  steps[i],
                  { autoAlpha: 0 },
                  { autoAlpha: 1, duration: 0.3 },
                  at,
                )
                .fromTo(
                  imgs[i],
                  { x: 0, y: 0, scale: 1 },
                  { x: 0, y: 0, scale: 1, duration: 0.01 },
                  at,
                )
                .to(
                  marker,
                  {
                    x: () => markTo(i).x,
                    width: () => markTo(i).width,
                    duration: 0.4,
                  },
                  at,
                );
            }
            // Камера наезжает на главное место вкладки
            tl.to(
              imgs[i],
              {
                x: () => aim(step, frames[i], imgs[i]).x,
                y: () => aim(step, frames[i], imgs[i]).y,
                scale: step.zoom,
                duration: 1,
              },
              at + 0.45,
            ).fromTo(
              steps[i].querySelector(`.${styles.focus}`),
              { autoAlpha: 0 },
              { autoAlpha: 1, duration: 0.3 },
              at + 1.1,
            );
          });
          tl.to({}, { duration: 0.4 });
        },
      );
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className={styles.section}
      data-surface="dark"
      aria-labelledby="panel-title"
    >
      <div className={styles.stage}>
        <div className={`wrap ${styles.grid}`}>
          <header className={styles.head}>
            <p className="label">{panel.label}</p>
            <h2 id="panel-title" className={styles.title}>
              {panel.title}
              <span className={styles.dotMark}>.</span>
            </h2>
            <p className={styles.lead}>{panel.lead}</p>
          </header>

          <div className={styles.window}>
            <div className={styles.tabs} aria-hidden="true">
              {panel.tabs.map((t) => (
                <span
                  key={t}
                  className={styles.tab}
                  data-live={panel.steps.some((s) => s.tab === t) || undefined}
                >
                  {t}
                </span>
              ))}
              <span className={styles.marker} />
            </div>

            <ol className={styles.steps}>
              {panel.steps.map((s) => (
                <li key={s.tab} className={styles.step}>
                  <div className={styles.frame}>
                    <div className={styles.img}>
                      <Image
                        src={s.img}
                        alt={s.alt}
                        sizes="(max-width: 960px) 92vw, 62vw"
                      />
                    </div>
                    <span className={styles.focus} aria-hidden="true" />
                  </div>
                  <div className={styles.copy}>
                    <p className={styles.stepTab}>{s.tab}</p>
                    <h3 className={styles.stepTitle}>{s.title}</h3>
                    <p className={styles.stepText}>{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className={styles.note}>{panel.note}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
