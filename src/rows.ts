import type { TileData } from "./types";

export type TileRow = {
  category: string;
  label: string;
  tiles: TileData[];
};

/** Groups tiles by category, keeping the order categories first appear in the config. */
export function groupIntoRows(tiles: TileData[]): TileRow[] {
  const rows: TileRow[] = [];

  for (const tile of tiles) {
    let row = rows.find((r) => r.category === tile.category);
    if (!row) {
      row = { category: tile.category, label: toLabel(tile.category), tiles: [] };
      rows.push(row);
    }
    row.tiles.push(tile);
  }

  return rows;
}

/** "streaming" -> "Streaming" */
function toLabel(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}