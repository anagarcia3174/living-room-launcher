// State of the options shown on the highlighted tile in Settings.
export type Menu =
  | { kind: "closed" }
  | { kind: "actions"; index: number }
  | { kind: "confirm-remove"; index: number };

export const CLOSED: Menu = { kind: "closed" };

export const ITEM_ACTIONS = ["Edit", "Move up", "Move down", "Remove"] as const;
export type ItemAction = (typeof ITEM_ACTIONS)[number];

// Cancel comes first, so it's the default choice.
export const CONFIRM_CHOICES = ["Cancel", "Remove"] as const;