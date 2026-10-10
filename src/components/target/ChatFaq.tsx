"use client";

import { useEffect, useRef, useState } from "react";
import type { TARGET } from "@/content/target";
import styles from "./ChatFaq.module.css";

type Data = (typeof TARGET)["faq"];
type Msg = { id: number; from: "me" | "them"; text: string };

const TYPING_MS = 1100;

/**
 * Вопросы как переписка с отделом. Слева вопросы-подсказки, как быстрые ответы в мессенджере;
 * нажатый вопрос уходит в чат справа, Евгения «печатает», и приходит ответ.
 * Первый вопрос уже задан, чтобы окно не было пустым. Все ответы целиком лежат в скрытом
 * списке для поиска и экранных дикторов: чат для них дублирует его и скрыт.
 */
export default function ChatFaq({ data, head }: { data: Data; head: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([
    { id: 0, from: "me", text: data.items[0].q },
    { id: 1, from: "them", text: data.items[0].a },
  ]);
  const [asked, setAsked] = useState<number[]>([0]);
  const [typing, setTyping] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const seq = useRef(2);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const ask = (i: number) => {
    if (typing) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const it = data.items[i];
    setAsked((a) => (a.includes(i) ? a : [...a, i]));
    setMsgs((m) => [...m, { id: seq.current++, from: "me" as const, text: it.q }].slice(-6));
    setTyping(true);
    timer.current = window.setTimeout(
      () => {
        setTyping(false);
        setMsgs((m) => [...m, { id: seq.current++, from: "them" as const, text: it.a }].slice(-6));
      },
      still ? 0 : TYPING_MS,
    );
  };

  return (
    <section className={styles.section} data-surface="dark" aria-labelledby="faq-title">
      <div className={`wrap ${styles.grid}`}>
        <div className={styles.side}>
          <h2 id="faq-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <div className={styles.quick}>
            {data.items.map((it, i) => (
              <button
                key={it.q}
                type="button"
                className={styles.chip}
                data-asked={asked.includes(i) || undefined}
                onClick={() => ask(i)}
                disabled={typing}
              >
                {it.q}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.chat} aria-hidden="true">
          <div className={styles.chatHead}>
            <span className={styles.ava}>{head[0]}</span>
            <span className={styles.chatName}>
              {head}
              <span className={styles.chatSub}>{typing ? `${data.typing}…` : data.chat}</span>
            </span>
          </div>
          <div className={styles.feed}>
            {msgs.map((m) => (
              <p key={m.id} className={styles.msg} data-from={m.from}>
                {m.text}
              </p>
            ))}
            {typing ? (
              <p className={styles.msg} data-from="them" data-typing>
                <span />
                <span />
                <span />
              </p>
            ) : null}
          </div>
        </div>

        <dl className="visually-hidden">
          {data.items.map((it) => (
            <div key={it.q}>
              <dt>{it.q}</dt>
              <dd>{it.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
