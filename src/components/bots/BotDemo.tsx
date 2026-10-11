"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { BOTS } from "@/content/bots";
import { botsState } from "./botsState";
import styles from "./BotDemo.module.css";

type Data = (typeof BOTS)["demo"];
type Msg = { from: "bot" | "me"; text: string; links?: { text: string; href: string }[] };

/**
 * Живой бот на первом экране. Человек нажимает кнопку, его вопрос уходит в чат, бот
 * «печатает» и отвечает. Ответы заранее написаны по фактам дел. Лента прокручивается внутри
 * окна, высота окна постоянная. Через пару секунд после появления бот сам задаёт первый вопрос.
 */
export default function BotDemo({ data }: { data: Data }) {
  const [msgs, setMsgs] = useState<Msg[]>([{ from: "bot", text: data.hello }]);
  const [typing, setTyping] = useState(false);
  const [asked, setAsked] = useState<string[]>([]);
  const feed = useRef<HTMLOListElement>(null);
  const timer = useRef<number | null>(null);
  const touched = useRef(false);

  // Каждое сообщение чата вылетает из окна в 3D-поток вокруг него
  const emit = (text: string, kind: "me" | "bot") => {
    botsState.last = { text, kind };
    botsState.sent += 1;
  };

  const ask = (i: number) => {
    const r = data.replies[i];
    if (typing) return;
    touched.current = true;
    setAsked((a) => [...a, r.q]);
    setMsgs((m) => [...m, { from: "me", text: r.q }]);
    emit(r.q, "me");
    setTyping(true);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    timer.current = window.setTimeout(
      () => {
        setTyping(false);
        setMsgs((m) => [...m, { from: "bot", text: r.a, links: "links" in r ? r.links : undefined }]);
        emit(r.tag, "bot");
      },
      still ? 0 : 900 + Math.min(r.a.length * 6, 900),
    );
  };

  // Первый вопрос бот показывает сам, если человек ничего не нажал
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (!touched.current) ask(0);
    }, 2600);
    return () => {
      window.clearTimeout(t);
      if (timer.current) window.clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = feed.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [msgs, typing]);

  return (
    <div className={styles.chat}>
      <div className={styles.bar}>
        <span className={styles.ava} aria-hidden="true">
          К
        </span>
        <span>
          <b>{data.name}</b>
          <small>{typing ? data.typing : "бот"}</small>
        </span>
      </div>
      <ol ref={feed} className={styles.feed} aria-live="polite">
        {msgs.map((m, i) => (
          <li key={i} className={styles.msg} data-from={m.from}>
            {m.text}
            {m.links ? (
              <span className={styles.links}>
                {m.links.map((l) => (
                  <Link key={l.href} href={l.href}>
                    {l.text}
                  </Link>
                ))}
              </span>
            ) : null}
          </li>
        ))}
        {typing ? (
          <li className={styles.msg} data-from="bot" aria-label="Бот печатает">
            <span className={styles.dots} aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </li>
        ) : null}
      </ol>
      <div className={styles.keys} role="group" aria-label="Вопросы боту">
        {data.replies.map((r, i) => (
          <button key={r.q} type="button" className={styles.key} onClick={() => ask(i)} disabled={typing} data-asked={asked.includes(r.q) || undefined}>
            {r.q}
          </button>
        ))}
      </div>
    </div>
  );
}
