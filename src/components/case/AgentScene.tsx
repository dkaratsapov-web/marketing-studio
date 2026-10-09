"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { SFERA } from "@/content/sfera";
import styles from "./AgentScene.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Props = { agent: (typeof SFERA)["agent"] };

/**
 * ИИ-агент по Директу. Справа живой интерфейс агента в стиле сайта: предложение печатается,
 * проявляются «цифра», «принцип», «риск», команда; курсор жмёт «Согласен и применить»,
 * ответ уходит в «Правила агента», а правка появляется в журнале с кнопкой «Вернуть как было».
 * Сцена проигрывается сама, когда интерфейс доходит до экрана. Слева границы агента, как пломбы.
 */
export default function AgentScene({ agent }: Props) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const section = root.current!;
      const ui = section.querySelector<HTMLElement>(`.${styles.ui}`)!;
      const part = (name: string) =>
        ui.querySelector<HTMLElement>(`[data-part="${name}"]`)!;
      const all = (name: string) => [
        ...ui.querySelectorAll<HTMLElement>(`[data-part="${name}"]`),
      ];

      const build = () => {
        const action = part("action");
        const cmd = part("cmd");
        const actionText = agent.proposal.action;
        const cmdText = agent.proposal.command;
        const typed = { a: 0, c: 0 };
        const pointer = part("pointer");
        const yes = part("yes");
        const at = () => {
          const u = ui.getBoundingClientRect();
          const r = yes.getBoundingClientRect();
          return {
            x: r.left - u.left + r.width * 0.55,
            y: r.top - u.top + r.height * 0.6,
          };
        };

        // Стартовый кадр явно: при пересчёте ScrollTrigger отматывает к нему
        action.textContent = "";
        cmd.textContent = "";
        gsap.set(all("row"), { autoAlpha: 0, x: -12 });
        gsap.set(
          [
            part("cmdLine"),
            part("buttons"),
            pointer,
            part("rule"),
            part("log"),
          ],
          { autoAlpha: 0 },
        );
        gsap.set(pointer, {
          x: () => ui.offsetWidth * 0.9,
          y: () => ui.offsetHeight * 0.95,
        });
        gsap.set(part("ruleWrap"), { height: 0 });
        gsap.set(part("logWrap"), { height: 0 });

        const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
        tl.to(typed, {
          a: actionText.length,
          duration: actionText.length * 0.02,
          ease: "none",
          onUpdate: () => {
            action.textContent = actionText.slice(0, Math.round(typed.a));
          },
        })
          .to(
            all("row"),
            { autoAlpha: 1, x: 0, duration: 0.35, stagger: 0.18 },
            "+=0.1",
          )
          .to(part("cmdLine"), { autoAlpha: 1, duration: 0.2 })
          .to(typed, {
            c: cmdText.length,
            duration: cmdText.length * 0.012,
            ease: "none",
            onUpdate: () => {
              cmd.textContent = cmdText.slice(0, Math.round(typed.c));
            },
          })
          .to(part("buttons"), { autoAlpha: 1, duration: 0.25 })
          .to(pointer, { autoAlpha: 1, duration: 0.15 }, "+=0.1")
          .to(
            pointer,
            {
              x: () => at().x,
              y: () => at().y,
              duration: 0.6,
              ease: "power3.inOut",
            },
            "<",
          )
          .to(pointer, { scale: 0.82, duration: 0.08, yoyo: true, repeat: 1 })
          .to(yes, { scale: 0.95, duration: 0.08, yoyo: true, repeat: 1 }, "<")
          .to(yes, { "--done": 1, duration: 0.2 })
          .to(pointer, { autoAlpha: 0, duration: 0.2 })
          // Ответ становится правилом, правка ложится в журнал
          .to(
            part("ruleWrap"),
            { height: "auto", duration: 0.4, ease: "power3.out" },
            "+=0.1",
          )
          .fromTo(
            part("rule"),
            { autoAlpha: 0, y: -8 },
            { autoAlpha: 1, y: 0, duration: 0.3 },
            "<0.1",
          )
          .to(
            part("logWrap"),
            { height: "auto", duration: 0.4, ease: "power3.out" },
            "+=0.15",
          )
          .fromTo(
            part("log"),
            { autoAlpha: 0, y: -8 },
            { autoAlpha: 1, y: 0, duration: 0.3 },
            "<0.1",
          )
          .fromTo(
            part("undo"),
            { "--pulse": 0 },
            { "--pulse": 1, duration: 0.35, yoyo: true, repeat: 1 },
            ">",
          );
        return tl;
      };

      // Сцена проигрывается сама, когда интерфейс агента показался: без закрепления экрана,
      // поэтому при быстром скролле она не застревает пустой
      // Чуть быстрее «реального» темпа: сцена должна закончиться, пока человек на неё смотрит
      const tl = build().timeScale(1.5);
      tl.pause();
      ScrollTrigger.create({
        trigger: ui,
        start: "top 75%",
        once: true,
        onEnter: () => tl.play(),
      });

      // Ограничители: бегунок едет к пределу, упирается в розовый стоп и чуть отскакивает
      const rails = gsap.utils.toArray<HTMLElement>(`.${styles.rail}`);
      rails.forEach((rail, i) => {
        const floor = rail.dataset.kind === "floor";
        const knob = rail.querySelector(`.${styles.knob}`);
        const stop = rail.querySelector(`.${styles.stopTag}`);
        gsap.set(knob, { left: "50%" });
        gsap.set(stop, { autoAlpha: 0 });
        gsap
          .timeline({
            delay: i * 0.15,
            scrollTrigger: {
              trigger: section.querySelector(`.${styles.limitList}`),
              start: "top 80%",
              once: true,
            },
          })
          .to(knob, {
            left: floor ? "18%" : "82%",
            duration: 0.7,
            ease: "power2.in",
          })
          .to(knob, {
            left: floor ? "22%" : "78%",
            duration: 0.5,
            ease: "back.out(3)",
          })
          .to(stop, { autoAlpha: 1, duration: 0.25 }, "<");
      });
    },
    { scope: root },
  );

  const p = agent.proposal;

  return (
    <section
      ref={root}
      className={styles.section}
      data-surface="light"
      aria-labelledby="agent-title"
    >
      <div className={styles.stage}>
        <div className={`wrap ${styles.grid}`}>
          <div className={styles.copy}>
            <p className="label">{agent.label}</p>
            <h2 id="agent-title" className={styles.title}>
              {agent.title}
              <span className={styles.dotMark}>.</span>
            </h2>
            <p className={styles.lead}>{agent.lead}</p>
            <p className={styles.can}>
              <span className="label">Правит сам после «согласен»</span>
              <span className={styles.chips}>
                {agent.can.map((c) => (
                  <span key={c} className={styles.chip}>
                    {c}
                  </span>
                ))}
              </span>
            </p>
          </div>

          {/* Интерфейс агента: пример из настоящей панели, пересобранный в стиле сайта */}
          <figure className={styles.uiWrap}>
            <div className={styles.ui} aria-hidden="true">
              <p className={styles.uiHead}>
                <span>Что предлагает агент</span>
                <span className={styles.uiBadge}>YandexGPT</span>
              </p>
              <div className={styles.card}>
                <p className={styles.action}>
                  <span className={styles.num}>1</span>
                  <span data-part="action">{p.action}</span>
                  <span className={styles.caret} />
                </p>
                <dl className={styles.rows}>
                  {p.rows.map((r) => (
                    <div
                      key={r.k}
                      className={styles.row}
                      data-part="row"
                      data-risk={r.k === "Риск" || undefined}
                    >
                      <dt>{r.k}</dt>
                      <dd>{r.v}</dd>
                    </div>
                  ))}
                </dl>
                <p className={styles.cmdLine} data-part="cmdLine">
                  <b>Агент выполнит</b> <span data-part="cmd">{p.command}</span>
                </p>
                <div className={styles.buttons} data-part="buttons">
                  <span className={styles.no}>{p.no}</span>
                  <span className={styles.yes} data-part="yes">
                    {p.yes}
                  </span>
                </div>
              </div>

              <div className={styles.extra} data-part="ruleWrap">
                <p className={styles.rule} data-part="rule">
                  <span className={styles.extraLabel}>Правила агента · +1</span>
                  {p.rule}
                </p>
              </div>
              <div className={styles.extra} data-part="logWrap">
                <p className={styles.log} data-part="log">
                  <span className={styles.extraLabel}>Журнал правок</span>
                  <span className={styles.logRow}>
                    <span>{p.log}</span>
                    <span className={styles.undo} data-part="undo">
                      ↺ {p.undo}
                    </span>
                  </span>
                </p>
              </div>

              <svg
                className={styles.pointer}
                data-part="pointer"
                viewBox="0 0 24 24"
              >
                <path
                  d="M5 3l14 8-6.2 1.6L10 19z"
                  fill="#fff"
                  stroke="#050505"
                  strokeWidth="1.3"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <figcaption className={styles.uiNote}>
              {agent.exampleNote}
            </figcaption>
          </figure>
        </div>
      </div>

      <div className={`wrap ${styles.bottom}`}>
        <div className={styles.limitsHead}>
          <p className={`label ${styles.limitsLabel}`}>{agent.limitsLabel}</p>
          <p className={styles.limitsLead}>{agent.limitsLead}</p>
        </div>
        <ul className={styles.limitList}>
          {agent.limits.map((l) => (
            <li key={l.label} className={styles.limit}>
              {/* Шкала-ограничитель: за розовым стопом штриховка, бегунок дальше не проходит */}
              <span
                className={styles.rail}
                data-kind={l.kind}
                aria-hidden="true"
              >
                <span className={styles.zone} />
                <span className={styles.stopLine} />
                <span className={styles.knob} />
                <span className={styles.stopTag}>стоп</span>
              </span>
              <span className={styles.limitValue}>{l.value}</span>
              <span className={styles.limitLabel}>{l.label}</span>
            </li>
          ))}
        </ul>
        <div className={styles.notes}>
          <p>{agent.undoNote}</p>
          <p>{agent.analyst}</p>
        </div>
      </div>
    </section>
  );
}
