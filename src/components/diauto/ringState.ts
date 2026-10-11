/** Связь первого экрана и WebGL-витрины: прогресс скролла и подписи под кольцом */
export const ringState = {
  /** 0…1 на закреплённом экране; на телефоне не используется */
  progress: 0,
  /** Без закрепления: колода раскрывается сама, кольцо крутится по времени */
  auto: false,
  caption: { no: null as HTMLElement | null, name: null as HTMLElement | null, meta: null as HTMLElement | null, price: null as HTMLElement | null },
};
