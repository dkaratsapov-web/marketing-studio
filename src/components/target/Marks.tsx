/**
 * Знаки площадок и салона из примеров. VK и Telegram из Simple Icons (CC0),
 * знак Авито собран из четырёх кругов фирменных цветов. Салон «Пион» выдуман для иллюстрации.
 */
type P = { className?: string };

export function VkMark({ className }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#0077FF" />
      <path
        fill="#fff"
        d="M12.77 17.29c-5.47 0-8.59-3.75-8.72-9.99h2.74c.09 4.58 2.11 6.52 3.71 6.92V7.3h2.58v3.95c1.58-.17 3.24-1.97 3.8-3.95h2.58c-.43 2.44-2.23 4.24-3.51 4.98 1.28.6 3.33 2.17 4.11 5.01h-2.84c-.61-1.9-2.13-3.37-4.14-3.57v3.57h-.31Z"
      />
    </svg>
  );
}

export function TelegramMark({ className }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#2AABEE" />
      <path
        fill="#fff"
        d="M16.906 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"
      />
    </svg>
  );
}

export function AvitoMark({ className }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="16.6" cy="7.6" r="5.6" fill="#97CF26" />
      <circle cx="7" cy="16.4" r="4.2" fill="#A169F7" />
      <circle cx="17.4" cy="18.2" r="3" fill="#FF6163" />
      <circle cx="6.4" cy="6.6" r="2.4" fill="#0AF" />
    </svg>
  );
}

/** Логотип салона из примера: пион из пяти лепестков на розовом */
export function SalonMark({ className }: P) {
  return (
    <svg className={className} viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="20" fill="#D1006A" />
      <g fill="#FFD3E6">
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx="20" cy="12.5" rx="5" ry="7" transform={`rotate(${a} 20 20)`} />
        ))}
      </g>
      <circle cx="20" cy="20" r="4.2" fill="#D1006A" />
      <circle cx="20" cy="20" r="1.8" fill="#FFD3E6" />
    </svg>
  );
}
