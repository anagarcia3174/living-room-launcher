// Abstract navigation actions. The keyboard maps to these now,
// and a controller can map to the same actions in Phase 10.
export type NavAction = "up" | "down" | "left" | "right" | "select";

const KEY_TO_ACTION: Record<string, NavAction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  Enter: "select",
};

export function actionFromKey(key: string): NavAction | null {
  return KEY_TO_ACTION[key] ?? null;
}