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