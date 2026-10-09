import type { NavAction } from "./actions";

type MoveAction = Exclude<NavAction, "select">;

/** Returns the new highlighted index after a move. No React, no DOM. */
export function moveInGrid(
  index: number,
  action: MoveAction,
  count: number,
  columns: number
): number {
  const column = index % columns;

  switch (action) {
    case "left":
      return column > 0 ? index - 1 : index;
    case "right":
      return column < columns - 1 && index + 1 < count ? index + 1 : index;
    case "up":
      return index - columns >= 0 ? index - columns : index;
    case "down": {
      if (index + columns < count) return index + columns;
      // If the next row exists but is shorter, go to its last tile.
      const lastRowStart = Math.floor((count - 1) / columns) * columns;
      return index < lastRowStart ? count - 1 : index;
    }
  }
}