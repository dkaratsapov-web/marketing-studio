type Props = { className?: string };

/** Знак: монолит, рассечённый световым швом. */
export function LogoMark({ className }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 32"
      fill="none"
      aria-hidden="true"
    >
      <path d="M0 2 L8.5 0 V32 H0 Z" fill="currentColor" />
      <path d="M11.5 0 L20 2 V32 H11.5 Z" fill="currentColor" />
      <rect x="9.25" y="3" width="1.5" height="26" fill="var(--accent)" />
    </svg>
  );
}

export function Logo({ className }: Props) {
  return (
    <span className={className}>
      <LogoMark className="logo__mark" />
      <span className="logo__word">Корпорация</span>
    </span>
  );
}
