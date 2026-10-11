import type { RETAIL } from "@/content/retail";
import styles from "./ShelfTag.module.css";

type Data = (typeof RETAIL)["tag"];

/** Штрихкод из цифр: у каждой цифры свой рисунок из четырёх полос разной толщины */
function Barcode({ code }: { code: string }) {
  const digits = code.replace(/\D/g, "").split("").map(Number);
  let x = 0;
  const bars: { x: number; w: number }[] = [];
  digits.forEach((d, i) => {
    const widths = [1 + (d % 3), 1 + ((d + i) % 2), 1 + ((d * 7) % 3), 1 + ((d + 1) % 2)];
    widths.forEach((w, k) => {
      if (k % 2 === 0) bars.push({ x, w });
      x += w + 1;
    });
  });
  return (
    <svg className={styles.barcode} viewBox={`0 0 ${x} 30`} preserveAspectRatio="none" aria-hidden="true">
      {bars.map((b) => (
        <rect key={b.x} x={b.x} y="0" width={b.w} height="30" />
      ))}
    </svg>
  );
}

/**
 * Ценник на полке. Луч сканера проходит по штрихкоду, и после каждого прохода на ценнике
 * загорается следующий плюс магазина: трейд-ин, гарантия низкой цены, гарантия на устройство.
 */
export default function ShelfTag({ data }: { data: Data }) {
  return (
    <div className={styles.tag}>
      <span className={styles.clip} aria-hidden="true" />
      <p className={styles.model}>
        {data.model}
        <span>{data.spec}</span>
      </p>
      <p className={styles.price}>
        {data.price.toLocaleString("ru-RU")}
        <span> ₽</span>
      </p>
      <ul className={styles.perks}>
        {data.perks.map((p, i) => (
          <li key={p} style={{ "--i": i } as React.CSSProperties}>
            {p}
          </li>
        ))}
      </ul>
      <div className={styles.code}>
        <Barcode code={data.code} />
        <span className={styles.laser} aria-hidden="true" />
        <span className={styles.digits}>{data.code}</span>
      </div>
    </div>
  );
}
