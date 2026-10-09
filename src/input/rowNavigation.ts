import type { NavAction } from "./actions";

export type Position = { row: number; col: number };

type MoveAction = Exclude<NavAction, "select">;

/** Returns the new position after a move. rowLengths[i] = number of tiles in row i. */
export function moveInRows(pos: Position, action: MoveAction, rowLengths: number[]): Position {
  const { row, col } = pos;

  switch (action) {
    case "left":
      return col > 0 ? { row, col: col - 1 } : pos;
    case "right":
      return col < rowLengths[row] - 1 ? { row, col: col + 1 } : pos;
    case "up":
      return row > 0 ? { row: row - 1, col: Math.min(col, rowLengths[row - 1] - 1) } : pos;
    case "down":
      return row < rowLengths.length - 1
        ? { row: row + 1, col: Math.min(col, rowLengths[row + 1] - 1) }
        : pos;
  }
}