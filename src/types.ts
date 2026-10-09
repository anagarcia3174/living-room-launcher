export type TileData = {
  id: string;
  name: string;
  category: string;
  image: string | null;
};

// Settings data from get_settings_tiles. Mirrors SettingsTile in settings.rs.
// Exe tiles carry a token; the path is for display only.
export type SettingsLaunch =
  | { type: "exe"; token: string; path: string }
  | { type: "url-app"; target: string }
  | { type: "protocol"; target: string };

export type SettingsTile = {
  id: string;
  name: string;
  category: string;
  image: string | null;
  launch: SettingsLaunch;
};

// What save_tiles accepts. Mirrors TileEdit in settings.rs:
// exe tiles are sent back as a token only, never a path.
export type LaunchEdit =
  | { type: "exe"; token: string }
  | { type: "url-app"; target: string }
  | { type: "protocol"; target: string };

export type TileEdit = Omit<SettingsTile, "launch"> & { launch: LaunchEdit };

// Result of pick_exe. Mirrors PickedExe in settings.rs.
export type PickedExe = { token: string; path: string };