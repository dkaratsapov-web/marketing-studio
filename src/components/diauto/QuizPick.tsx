"use client";

import Image from "next/image";
import { useState } from "react";
import type { DIAUTO } from "@/content/diauto";
import { CARS } from "@/content/diauto";
import styles from "./QuizPick.module.css";

type Data = (typeof DIAUTO)["quiz"];

/**
 * Квиз-подбор на живой витрине. Слева первый вопрос квиза ДиАвто69, справа десять
 * настоящих карточек каталога. Ответ отсеивает лишние машины: сетка стоит на месте,
 * неподходящие гаснут, подходящие получают салатовую рамку. «Любая» возвращает все.
 */
export default function QuizPick({ data }: { data: Data }) {
  const [pick, setPick] = useState<string | null>(null);

  const fits = (country: string) => !pick || pick === "Любая" || pick === country;
  const count = CARS.filter((c) => fits(c.country)).length;
  const step = pick ? 2 : 1;

  return (
    <section className={styles.section} data-surface="dark" aria-labelledby="quiz-title">
      <div className={`wrap ${styles.grid}`}>
        <header className={styles.head}>
          <h2 id="quiz-title" className={styles.title}>
            {data.title}
            <span className={styles.dotMark}>.</span>
          </h2>
          <p className={styles.lead}>{data.lead}</p>
        </header>

        <div className={styles.quiz}>
          <p className={styles.quizTop}>Рассчитать стоимость за минуту</p>
          <span className={styles.progress} style={{ "--p": step / 5 } as React.CSSProperties} aria-hidden="true" />
          <fieldset className={styles.set}>
            <legend className={styles.question}>{data.question}</legend>
            {data.options.map((o) => (
              <label key={o} className={styles.option}>
                <input type="radio" name="diauto-country" value={o} checked={pick === o} onChange={() => setPick(o)} />
                <span>{o === "Любая" ? "Любая, посоветуйте" : o}</span>
              </label>
            ))}
          </fieldset>
          <p className={styles.step}>
            Шаг {step} из 5 · {step * 20}%
          </p>
          <p className={styles.found} aria-live="polite">
            {data.found}: <b>{count}</b> из {CARS.length} авто
          </p>
        </div>

        <ul className={styles.cars}>
          {CARS.map((c, i) => (
            <li key={i} className={styles.car} data-off={!fits(c.country) || undefined} data-fit={(pick && pick !== "Любая" && fits(c.country)) || undefined}>
              <Image src={c.img} alt={`${c.name} ${c.year}, ${c.country}, ${new Intl.NumberFormat("ru-RU").format(c.price)} ₽ под ключ до Москвы`} className={styles.carImg} sizes="(max-width: 640px) 45vw, (max-width: 1100px) 30vw, 12vw" />
            </li>
          ))}
        </ul>

        <div className={styles.foot}>
          <p className={styles.reviews}>{data.reviews}</p>
          <p className={styles.note}>{data.note}</p>
        </div>
      </div>
    </section>
  );
}
