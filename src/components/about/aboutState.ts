/**
 * Общее состояние DOM-слоя «О нас» и WebGL-башни. Мутабельный объект, чтобы не гонять
 * ре-рендеры React на каждом кадре: прогресс подъёма пишет скролл, подписи этажей и табло
 * регистрируются из DOM, сцена двигает их каждый кадр.
 */
export const aboutState = {
  progress: 0,
  labels: [] as (HTMLElement | null)[],
  display: null as HTMLElement | null,
};
