"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import HeroLead from "@/components/hero/HeroLead";
import type { BOTS } from "@/content/bots";
import BotDemo from "./BotDemo";
import styles from "./BotsHero.module.css";

const MessageStream = dynamic(() => import("./MessageStream"), { ssr: false });

/**
 * Первый экран услуги «Боты». Заголовок набирается как сообщение, справа настоящий
 * интерфейс бота: можно нажать кнопку и получить ответ. Вокруг окна по спирали
 * поднимается 3D-поток сообщений, и каждое сообщение из чата вылетает в этот поток.
 */
export default function BotsHero({ data }: { data: typeof BOTS }) {
  return (
    <section id="top" className={styles.hero} data-surface="dark">
      <div className={styles.grain} aria-hidden="true" />
      <div className={styles.glow} aria-hidden="true" />

      <div className={`wrap ${styles.grid}`}>
        <div className={styles.top}>
          <nav className={styles.crumbs} aria-label="Хлебные крошки">
            <Link href="/">Корпорация</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{data.name}</span>
          </nav>
          <p className={`label ${styles.kicker}`}>
            Отдел разработки <span className={styles.tools}>· Telegram и MAX</span>
          </p>
        </div>

        <h1 className={styles.title}>
          <span className="visually-hidden">{data.name}: </span>
          {data.title.map((word, i) => (
            <span key={word} className={styles.mask}>
              <span className={styles.line} style={{ "--i": i } as React.CSSProperties}>
                {word}
                {i === data.title.length - 1 ? <span className={styles.dot}>.</span> : null}
              </span>
            </span>
          ))}
        </h1>

        <div className={styles.leadWrap}>
          <div className={styles.lead}>
            <p className={styles.leadText}>{data.lead}</p>
            <HeroLead source="service" service={data.name} cta={data.brief.cta} />
            <dl className={styles.facts}>
              {data.facts.map((f) => (
                <div key={f.label} className={styles.fact}>
                  <dt>{f.label}</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <figure className={styles.stage}>
          <MessageStream phrases={data.demo.stream} />
          <div className={styles.chatWrap}>
            <BotDemo data={data.demo} />
          </div>
          <figcaption className={styles.note}>{data.demo.note}</figcaption>
        </figure>
      </div>
    </section>
  );
}
