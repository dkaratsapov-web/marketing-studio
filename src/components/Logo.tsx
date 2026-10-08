import { MARK } from "./logoGeometry";

type Props = { className?: string; size?: "small" | "large" };

/**
 * Знак «Этажи»: буква К из горизонтальных этажей, один этаж горит акцентом.
 * В мелком размере этажей меньше, чтобы полосы не слипались.
 */
export function LogoMark({ className, size = "small" }: Props) {
  const g = MARK[size];
  return (
    <svg
      className={className}
      viewBox={`0 0 ${MARK.w} ${MARK.h}`}
      fill="none"
      aria-hidden="true"
    >
      <path d={g.ink} fill="currentColor" />
      <path className="logo__floor" d={g.lime} fill="var(--accent)" />
    </svg>
  );
}

/** Строка из песни Элджея «Корпорация»: по наведению на логотип она договаривается до названия */
export const QUOTE = "У нас столько проектов — мы целая";

export function Logo({ className }: Props) {
  return (
    <span className={className}>
      <LogoMark className="logo__mark" />
      <span className="logo__quote" aria-hidden="true">
        {QUOTE}
      </span>
      <span className="logo__word">Корпорация</span>
    </span>
  );
}
