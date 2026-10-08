/** «Дешифровка» текста: символы перебираются случайными знаками и встают на место слева направо */
const GLYPHS = "АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЫЭЮЯ0123456789#%&/<>";

export function scramble(el: HTMLElement, text: string, duration = 700) {
  const start = performance.now();
  let raf = 0;
  const frame = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    const settled = Math.floor(t * text.length);
    let out = "";
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      out += i < settled || ch === " " ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    }
    el.textContent = out;
    if (t < 1) raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}
