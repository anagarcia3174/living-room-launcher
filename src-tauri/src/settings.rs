use crate::config::{Config, Launch, Tile};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Rust's private list of approved exe paths, keyed by token.
/// The frontend only ever sees tokens, and gets paths for display only.
#[derive(Default)]
pub struct ExeTokens {
    paths: HashMap<String, String>,
    next_id: u64,
}

impl ExeTokens {
    /// Stores an approved path and returns a new token for it.
    pub fn issue(&mut self, path: String) -> String {
        self.next_id += 1;
        let token = format!("exe-{}", self.next_id);
        self.paths.insert(token.clone(), path);
        token
    }

    pub fn resolve(&self, token: &str) -> Option<&String> {
        self.paths.get(token)
    }
}

/// A tile as shown in Settings. Exe paths are included for display only.
#[derive(Serialize)]
pub struct SettingsTile {
    pub id: String,
    pub name: String,
    pub category: String,
    pub image: Option<String>,
    pub launch: SettingsLaunch,
}

#[derive(Serialize)]
#[serde(tag = "type", rename_all = "kebab-case")]
pub enum SettingsLaunch {
    Exe { token: String, path: String },
    UrlApp { target: String },
    Protocol { target: String },
}

/// What the frontend sends back when saving.
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TileEdit {
    pub id: String,
    pub name: String,
    pub category: String,
    pub image: Option<String>,
    pub launch: LaunchEdit,
}

/// Exe tiles can only be saved by token. There is no way to send a path.
#[derive(Deserialize)]
#[serde(tag = "type", rename_all = "kebab-case")]
pub enum LaunchEdit {
    Exe { token: String },
    UrlApp { target: String },
    Protocol { target: String },
}

/// Result of picking a program in the file dialog.
#[derive(Serialize)]
pub struct PickedExe {
    pub token: String,
    pub path: String,
}

/// Converts the config into Settings data, issuing a token for each exe path.
pub fn to_settings_tiles(config: &Config, tokens: &mut ExeTokens) -> Vec<SettingsTile> {
    config
        .tiles
        .iter()
        .map(|tile| SettingsTile {
            id: tile.id.clone(),
            name: tile.name.clone(),
            category: tile.category.clone(),
            image: tile.image.clone(),
            launch: match &tile.launch {
                Launch::Exe(path) => SettingsLaunch::Exe {
                    token: tokens.issue(path.clone()),
                    path: path.clone(),
                },
                Launch::UrlApp(target) => SettingsLaunch::UrlApp { target: target.clone() },
                Launch::Protocol(target) => SettingsLaunch::Protocol { target: target.clone() },
            },
        })
        .collect()
}

/// Turns edits from the frontend back into a Config, swapping tokens for real paths.
/// Full validation happens afterwards in config::save_config.
pub fn from_edits(edits: Vec<TileEdit>, tokens: &ExeTokens) -> Result<Config, String> {
    let mut tiles = Vec::with_capacity(edits.len());

    for edit in edits {
        let launch = match edit.launch {
            LaunchEdit::Exe { token } => {
                let path = tokens
                    .resolve(&token)
                    .ok_or_else(|| format!("\"{}\": unknown program reference", edit.name))?;
                Launch::Exe(path.clone())
            }
            LaunchEdit::UrlApp { target } => Launch::UrlApp(target),
            LaunchEdit::Protocol { target } => Launch::Protocol(target),
        };

        tiles.push(Tile {
            id: edit.id,
            name: edit.name,
            category: edit.category,
            image: edit.image,
            launch,
        });
    }

    Ok(Config { tiles })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::parse_config;

    const SAMPLE: &str = r#"{ "tiles": [
        { "id": "game", "name": "Game", "category": "games",
          "launch": { "type": "exe", "target": "C:\\Games\\game.exe" } },
        { "id": "web", "name": "Web", "category": "streaming",
          "launch": { "type": "url-app", "target": "https://example.com" } }
    ] }"#;

    /// Simulates the frontend: Settings data goes out as JSON and comes back as edits.
    fn round_trip_json(tiles: Vec<SettingsTile>) -> Vec<TileEdit> {
        serde_json::from_value(serde_json::to_value(tiles).unwrap()).unwrap()
    }

    #[test]
    fn round_trip_keeps_exe_path() {
        let config = parse_config(SAMPLE).unwrap();
        let mut tokens = ExeTokens::default();
        let edits = round_trip_json(to_settings_tiles(&config, &mut tokens));
        let saved = from_edits(edits, &tokens).unwrap();

        match &saved.tiles[0].launch {
            Launch::Exe(path) => assert_eq!(path, r"C:\Games\game.exe"),
            _ => panic!("expected an exe launch"),
        }
    }

    #[test]
    fn rejects_unknown_token() {
        let edits: Vec<TileEdit> = serde_json::from_str(
            r#"[{ "id": "x", "name": "X", "category": "games", "image": null,
                 "launch": { "type": "exe", "token": "made-up" } }]"#,
        )
        .unwrap();
        assert!(from_edits(edits, &ExeTokens::default()).is_err());
    }

    #[test]
    fn rejects_raw_exe_path() {
        let result: Result<Vec<TileEdit>, _> = serde_json::from_str(
            r#"[{ "id": "x", "name": "X", "category": "games", "image": null,
                 "launch": { "type": "exe", "target": "C:\\Windows\\System32\\cmd.exe" } }]"#,
        );
        assert!(result.is_err());
    }
}