import type { SettingsLaunch, SettingsTile, TileEdit } from "../types";

/**
 * Moves a tile one step up or down among tiles of the SAME category.
 * Returns the original array unchanged if it can't move (already first or last).
 */
export function moveWithinCategory<T extends { id: string; category: string }>(
  tiles: T[],
  id: string,
  direction: -1 | 1
): T[] {
  const index = tiles.findIndex((t) => t.id === id);
  if (index === -1) return tiles;

  const category = tiles[index].category;
  let other = index + direction;
  while (other >= 0 && other < tiles.length && tiles[other].category !== category) {
    other += direction;
  }
  if (other < 0 || other >= tiles.length) return tiles;

  const next = [...tiles];
  [next[index], next[other]] = [next[other], next[index]];
  return next;
}

/** Converts Settings data into what save_tiles accepts. */
export function toEdits(tiles: SettingsTile[]): TileEdit[] {
  return tiles.map((tile) => ({
    id: tile.id,
    name: tile.name,
    category: tile.category,
    image: tile.image,
    // Exe tiles go back as a token only; Rust swaps it for the real path.
    launch: tile.launch.type === "exe" ? { type: "exe", token: tile.launch.token } : tile.launch,
  }));
}

export const LAUNCH_LABELS: Record<SettingsLaunch["type"], string> = {
  exe: "Program",
  "url-app": "Website",
  protocol: "Link",
};

/** The path or URL to show under a tile's name. */
export function describeLaunch(launch: SettingsLaunch): string {
  return launch.type === "exe" ? launch.path : launch.target;
}