export type NavAction = "up" | "down" | "left" | "right" | "select" | "back";

const KEY_TO_ACTION: Record<string, NavAction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  Enter: "select",
  Escape: "back",
};

export function actionFromKey(key: string): NavAction | null {
  return KEY_TO_ACTION[key] ?? null;
}