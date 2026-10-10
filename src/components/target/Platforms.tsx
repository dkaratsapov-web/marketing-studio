"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { TARGET } from "@/content/target";
import adMain from "@/assets/target/ad-main.webp";
import nbRed from "@/assets/target/nb-red.webp";
import nbNude from "@/assets/target/nb-nude.webp";
import { AvitoMark, SalonMark, TelegramMark, VkMark } from "./Marks";
import styles from "./Platforms.module.css";

const NB_PHOTO = { red: nbRed, nude: nbNude };
const PLATFORM_MARK = { vk: VkMark, tg: TelegramMark, avito: AvitoMark };

type Data = (typeof TARGET)["platforms"];
type Key = Data["items"][number]["key"];
type Props = { platforms: Data };

const STEP_MS = 4200;

/**
 * «Одно предложение, три площадки». Справа экраны трёх площадок с одним и тем же предложением:
 * пост с фото во ВКонтакте, спонсорское сообщение под постом канала в Telegram, карточка
 * в выдаче Авито среди соседей. Экраны лежат стопкой в одной клетке сетки: выбранный впереди,
 * остальные отъезжают в сторону с поворотом и гаснут, как переключение приложений.
 * Так высота сцены постоянная и между площадками нет промежуточного кадра, где всё смешано.
 * Вкладки слева переключаются сами, пока блок на экране, и по клику.
 */
export default function Platforms({ platforms }: Props) {
  const root = useRef<HTMLElement>(null);
  const id = useId();
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(false);
  const items = platforms.items;
  const key = items[active].key;
  const Mark = PLATFORM_MARK[key];

  // Автопереключение, пока блок на экране и человек не взялся за вкладки сам
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const st = ScrollTrigger.create({
      trigger: root.current,
      start: "top 70%",
      end: "bottom 30%",
      onToggle: (self) => setAuto(self.isActive),
    });
    return () => st.kill();
  }, []);

  const go = useCallback((i: number) => setActive(i), []);

  useEffect(() => {
    if (!auto) return;
    const t = window.setTimeout(() => go((active + 1) % items.length), STEP_MS);
    return () => window.clearTimeout(t);
  }, [auto, active, go, items.length]);

  return (
    <section
      ref={root}
      className={styles.section}
      data-surface="light"
      aria-labelledby="platforms-title"
    >
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="platforms-title" className={styles.title}>
            {platforms.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{platforms.lead}</p>
        </header>

        <div className={styles.tabs} role="tablist" aria-label="Площадки">
          {items.map((it, i) => (
            <button
              key={it.key}
              type="button"
              role="tab"
              id={`${id}-tab-${i}`}
              aria-selected={i === active}
              aria-controls={`${id}-panel`}
              className={styles.tab}
              onClick={() => {
                setAuto(false);
                go(i);
              }}
            >
              <span className={styles.tabName}>{it.name}</span>
              <span className={styles.tabWhere}>{it.where}</span>
              <span className={styles.tabText}>
                <span>{it.text}</span>
              </span>
              {/* Полоска времени до следующей вкладки */}
              <span
                key={`${active}-${auto}`}
                className={styles.tabTimer}
                data-run={(auto && i === active) || undefined}
                style={{ animationDuration: `${STEP_MS}ms` }}
                aria-hidden="true"
              />
            </button>
          ))}
        </div>

        <div
          id={`${id}-panel`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${active}`}
          className={styles.stage}
          data-platform={key}
        >
          <p className={styles.format}>
            <Mark className={styles.formatMark} />
            <span>{items[active].name}</span> · {items[active].format}
          </p>

          <div className={styles.deck}>
            {items.map((it, i) => (
              <div
                key={it.key}
                className={styles.slot}
                data-state={i === active ? "on" : i < active ? "prev" : "next"}
                aria-hidden={i !== active || undefined}
                inert={i !== active}
              >
                <Screen k={it.key} data={platforms} />
              </div>
            ))}
          </div>

          <p className={styles.note}>{platforms.note}</p>
        </div>
      </div>
    </section>
  );
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className={styles.icon}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

/** Соседнее объявление в выдаче Авито: чужая карточка, без нашего выделения */
function Neighbor({ n }: { n: Data["avito"]["neighbors"][number] }) {
  return (
    <span className={styles.neighbor} aria-hidden="true">
      <Image src={NB_PHOTO[n.photo]} alt={`${n.title}: фото соседнего объявления`} className={styles.nbPhoto} sizes="200px" />
      <span className={styles.nbTitle}>{n.title}</span>
      <span className={styles.nbPrice}>{n.price}</span>
      <span className={styles.nbPlace}>{n.place}</span>
    </span>
  );
}

/** Экран одной площадки: шапка, окружение и карточка в её формате */
function Screen({ k, data }: { k: Key; data: Data }) {
  const c = data.card;
  const tg = data.tgChannel;
  const av = data.avito;
  return (
    <div className={styles.screen} data-platform={k}>
      {/* Шапка площадки: своя у каждой, проявляется при смене вкладки */}
      {k === "vk" ? (
        <div key="vk" className={styles.bar} data-bar="vk" aria-hidden="true">
          <VkMark className={styles.barMark} />
          <span className={styles.barTitle}>Лента</span>
          <span className={styles.barSearch} />
        </div>
      ) : k === "tg" ? (
        <div key="tg" className={styles.bar} data-bar="tg" aria-hidden="true">
          <span className={styles.barBack} />
          <span className={styles.chanAva}>ТС</span>
          <span className={styles.chanText}>
            <span className={styles.barTitle}>{tg.name}</span>
            <span className={styles.chanKind}>{tg.kind}</span>
          </span>
        </div>
      ) : (
        <div key="avito" className={styles.bar} data-bar="avito" aria-hidden="true">
          <AvitoMark className={styles.barMark} />
          <span className={styles.avitoWord}>Авито</span>
          <span className={styles.avitoSearch}>{av.query}</span>
          <span className={styles.avitoCity}>{av.city}</span>
        </div>
      )}

      <div className={styles.feedArea}>
        {k === "tg" ? (
          <p key="post" className={styles.chanPost}>
            {tg.post}
            <span className={styles.chanTime}>{tg.time}</span>
          </p>
        ) : null}
        {k === "avito" ? (
          <Neighbor n={av.neighbors[0]} />
        ) : null}
        <div className={styles.card} data-platform={k}>
          <span className={styles.who}>
            <SalonMark className={styles.ava} />
            <span className={styles.whoText}>
              <span className={styles.whoName}>{c.who}</span>
              <span className={styles.badge}>{c.badge[k]}</span>
            </span>
          </span>
          {/* В формате Telegram фото скрыто стилями: спонсорское сообщение без картинки */}
          <span className={styles.media}>
            <Image
              src={adMain}
              alt={c.photo}
              className={styles.photo}
              sizes="(max-width: 960px) 90vw, 420px"
            />
          </span>
          <span className={styles.cardTitle}>
            {c.title}
          </span>
          {k === "avito" ? (
            <span className={styles.price}>
              {c.price}
            </span>
          ) : null}
          <span className={styles.cardText}>
            {c.text[k]}
          </span>
          {k === "vk" ? (
            <span className={styles.link}>
              {c.link}
            </span>
          ) : null}
          <span className={styles.cta}>
            {c.cta[k]}
          </span>
          {k === "vk" ? (
            <span className={styles.reactions} aria-hidden="true">
              <Icon d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
              <Icon d="M5 5h14v10H9l-4 4V5Z" />
              <Icon d="M14 5l6 6-6 6v-4c-5 0-8 1.5-10 5 .8-5 3.5-9 10-9V5Z" />
            </span>
          ) : null}
        </div>
        {k === "tg" ? (
          <span className={styles.why}>{tg.why}</span>
        ) : null}
        {k === "avito" ? (
          <Neighbor n={av.neighbors[1]} />
        ) : null}
      </div>
    </div>
  );
}
