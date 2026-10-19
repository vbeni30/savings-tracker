export type MobileTabId = "home" | "insights" | "plan" | "history" | "coach";

export function appPageClass(tab: MobileTabId, active: MobileTabId): string {
  return `app-page app-page-${tab}${active === tab ? " active" : ""}`;
}
