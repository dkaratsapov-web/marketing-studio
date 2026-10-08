/** Открыть поп-ап брифа из любого места. service — услуга, из которой открыли. */
export function openBrief(service?: string) {
  window.dispatchEvent(new CustomEvent("brief:open", { detail: { service } }));
}
