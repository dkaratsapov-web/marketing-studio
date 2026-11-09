"use client";

import { useEffect, useState } from "react";
import styles from "./Thanks.module.css";

const DELAY = 3;

/** Только свой адрес: путь с одним «/» в начале, не сама «Спасибо». Иначе — главная. */
export function safeBack(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return "/";
  if (raw.startsWith("/spasibo")) return "/";
  return raw;
}

/** Через 3 секунды возвращает на страницу, с которой отправили заявку. */
export default function Return() {
  const [left, setLeft] = useState(DELAY);

  useEffect(() => {
    const back = safeBack(new URLSearchParams(window.location.search).get("back"));
    const tick = window.setInterval(() => setLeft((n) => Math.max(0, n - 1)), 1000);
    // replace: кнопка «Назад» не вернёт снова на «Спасибо»
    const go = window.setTimeout(() => window.location.replace(back), DELAY * 1000);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(go);
    };
  }, []);

  return (
    <p className={styles.back} aria-live="polite">
      Вернём вас на страницу, с которой вы отправили заявку, через {left}&nbsp;сек.
    </p>
  );
}
