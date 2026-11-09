import { LEGAL_LINKS } from "@/content/legal";

/**
 * Подпись у кнопки формы со ссылками на согласие и политику.
 * checkbox — текст для галочки («Согласен…»), иначе — «Нажимая кнопку…».
 */
export default function ConsentNote({ checkbox = false }: { checkbox?: boolean }) {
  const link = (l: { href: string }, text: string) => (
    <a href={l.href} target="_blank" rel="noopener" className="legal-link">
      {text}
    </a>
  );
  return checkbox ? (
    <>
      Согласен на {link(LEGAL_LINKS.consent, "обработку персональных данных")} по{" "}
      {link(LEGAL_LINKS.policy, "политике конфиденциальности")}
    </>
  ) : (
    <>
      Нажимая кнопку, вы даёте {link(LEGAL_LINKS.consent, "согласие на обработку персональных данных")} и принимаете{" "}
      {link(LEGAL_LINKS.policy, "политику конфиденциальности")}
    </>
  );
}
