import type { SettingsTile } from "../types";

export type LaunchType = SettingsTile["launch"]["type"];
export const LAUNCH_TYPES: LaunchType[] = ["url-app", "exe", "protocol"];

export type TileForm = {
  originalId: string | null; // null when adding a new tile
  name: string;
  category: string;
  launchType: LaunchType;
  target: string;            // website or link address
  exeToken: string | null;   // from the file picker; never a path
  exePath: string | null;    // display only
  image: string;
};

export function emptyForm(category: string): TileForm {
  return {
    originalId: null,
    name: "",
    category,
    launchType: "url-app",
    target: "",
    exeToken: null,
    exePath: null,
    image: "",
  };
}

export function formFromTile(tile: SettingsTile): TileForm {
  const launch = tile.launch;
  return {
    originalId: tile.id,
    name: tile.name,
    category: tile.category,
    launchType: launch.type,
    target: launch.type === "exe" ? "" : launch.target,
    exeToken: launch.type === "exe" ? launch.token : null,
    exePath: launch.type === "exe" ? launch.path : null,
    image: tile.image ?? "",
  };
}

/**
 * Builds a tile from the form, or returns a message about what's missing.
 * These are quick checks for a friendly message; Rust re-validates everything on save.
 */
export function tileFromForm(form: TileForm, otherIds: string[]): SettingsTile | string {
  const name = form.name.trim();
  if (!name) return "Name is required.";

  let launch: SettingsTile["launch"];
  if (form.launchType === "exe") {
    if (!form.exeToken || !form.exePath) return "Choose a program.";
    launch = { type: "exe", token: form.exeToken, path: form.exePath };
  } else {
    const target = form.target.trim();
    if (!target) {
      return form.launchType === "url-app" ? "Website address is required." : "Link is required.";
    }
    launch = { type: form.launchType, target };
  }

  return {
    id: form.originalId ?? uniqueId(name, otherIds),
    name,
    category: form.category,
    image: form.image.trim() || null,
    launch,
  };
}

/** "Prime Video" -> "prime-video", or "prime-video-2" if that's taken. */
function uniqueId(name: string, taken: string[]): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "tile";
  let id = base;
  let n = 2;
  while (taken.includes(id)) id = `${base}-${n++}`;
  return id;
}