use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::Path;

/// URL schemes a `protocol` tile may use. Add new ones here on purpose.
const ALLOWED_PROTOCOLS: &[&str] = &["steam"];

/// The starter config, embedded into the app at compile time.
const DEFAULT_CONFIG: &str = include_str!("../default-tiles.json");

/// Loads tiles.json from `dir`, creating it from the starter config if missing.
pub fn load_or_create(dir: &Path) -> Result<Config, String> {
    let path = dir.join("tiles.json");

    if !path.exists() {
        fs::create_dir_all(dir)
            .map_err(|e| format!("Could not create {}: {e}", dir.display()))?;
        fs::write(&path, DEFAULT_CONFIG)
            .map_err(|e| format!("Could not write {}: {e}", path.display()))?;
    }

    println!("Loading tiles from {}", path.display());
    let json = fs::read_to_string(&path)
        .map_err(|e| format!("Could not read {}: {e}", path.display()))?;
    parse_config(&json).map_err(|e| format!("{e}\n(in {})", path.display()))
}

/// How a tile is launched. The JSON "type" field selects the variant,
/// and "target" becomes the String inside it.
#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "type", content = "target", rename_all = "kebab-case")]
pub enum Launch {
    Exe(String),      // "exe"
    UrlApp(String),   // "url-app"
    Protocol(String), // "protocol"
}

/// A full tile as stored in the config. Stays in the backend only.
#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Tile {
    pub id: String,
    pub name: String,
    pub category: String,
    pub image: Option<String>,
    pub launch: Launch,
}

/// The whole config file: { "tiles": [ ... ] }
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Config {
    pub tiles: Vec<Tile>,
}

/// What the frontend is allowed to see. Note: no launch info.
#[derive(Debug, Clone, Serialize)]
pub struct TileView {
    pub id: String,
    pub name: String,
    pub category: String,
    pub image: Option<String>,
}

impl From<&Tile> for TileView {
    fn from(tile: &Tile) -> Self {
        TileView {
            id: tile.id.clone(),
            name: tile.name.clone(),
            category: tile.category.clone(),
            image: tile.image.clone(),
        }
    }
}

/// Parse JSON text into a Config, then validate it.
pub fn parse_config(json: &str) -> Result<Config, String> {
    let config: Config =
        serde_json::from_str(json).map_err(|e| format!("Invalid config: {e}"))?;
    validate(&config)?;
    Ok(config)
}

fn validate(config: &Config) -> Result<(), String> {
    let mut seen_ids = HashSet::new();

    for (index, tile) in config.tiles.iter().enumerate() {
        let label = format!("Tile #{} (\"{}\")", index + 1, tile.id);

        let id_is_valid = !tile.id.is_empty()
            && tile
                .id
                .chars()
                .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-');
        if !id_is_valid {
            return Err(format!(
                "{label}: id must use only lowercase letters, digits and dashes"
            ));
        }
        if !seen_ids.insert(tile.id.as_str()) {
            return Err(format!("{label}: duplicate id"));
        }
        if tile.name.trim().is_empty() {
            return Err(format!("{label}: name is empty"));
        }
        if tile.category.trim().is_empty() {
            return Err(format!("{label}: category is empty"));
        }
        if let Some(image) = &tile.image {
            if !is_plain_file_name(image) {
                return Err(format!(
                    "{label}: image must be a file name only, like \"netflix.png\""
                ));
            }
        }

        match &tile.launch {
            Launch::Exe(path) => {
                let is_exe = path.to_ascii_lowercase().ends_with(".exe");
                if !Path::new(path).is_absolute() || !is_exe {
                    return Err(format!(
                        "{label}: exe target must be a full path to an .exe file"
                    ));
                }
            }
            Launch::UrlApp(url) => {
                if !url.starts_with("https://") {
                    return Err(format!("{label}: url-app target must start with https://"));
                }
            }
            Launch::Protocol(url) => {
                let scheme = url.split_once("://").map(|(s, _)| s.to_ascii_lowercase());
                let allowed = matches!(&scheme, Some(s) if ALLOWED_PROTOCOLS.contains(&s.as_str()));
                if !allowed {
                    return Err(format!(
                        "{label}: protocol must start with one of: {}",
                        ALLOWED_PROTOCOLS.join(", ")
                    ));
                }
            }
        }
    }

    Ok(())
}

/// True for "netflix.png", false for anything with a path in it.
fn is_plain_file_name(name: &str) -> bool {
    !name.is_empty()
        && name != "."
        && name != ".."
        && !name.contains(|c| c == '/' || c == '\\' || c == ':')
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Builds a one-tile config with the given launch JSON.
    fn one_tile(launch: &str) -> String {
        format!(
            r#"{{ "tiles": [ {{ "id": "test", "name": "Test", "category": "apps", "launch": {launch} }} ] }}"#
        )
    }

    #[test]
    fn accepts_valid_config() {
        let json = r#"{ "tiles": [
            { "id": "netflix", "name": "Netflix", "category": "streaming", "image": "netflix.png",
              "launch": { "type": "url-app", "target": "https://www.netflix.com" } },
            { "id": "some-game", "name": "Some Game", "category": "games",
              "launch": { "type": "exe", "target": "C:\\Games\\SomeGame\\game.exe" } },
            { "id": "steam-game", "name": "Steam Game", "category": "games",
              "launch": { "type": "protocol", "target": "steam://rungameid/12345" } }
        ] }"#;
        assert!(parse_config(json).is_ok());
    }

    #[test]
    fn rejects_unknown_launch_type() {
        let json = one_tile(r#"{ "type": "script", "target": "anything" }"#);
        assert!(parse_config(&json).is_err());
    }

    #[test]
    fn rejects_relative_exe_path() {
        let json = one_tile(r#"{ "type": "exe", "target": "game.exe" }"#);
        assert!(parse_config(&json).is_err());
    }

    #[test]
    fn rejects_non_https_url_app() {
        let json = one_tile(r#"{ "type": "url-app", "target": "http://example.com" }"#);
        assert!(parse_config(&json).is_err());
    }

    #[test]
    fn rejects_unlisted_protocol() {
        let json = one_tile(r#"{ "type": "protocol", "target": "file://C:/Windows" }"#);
        assert!(parse_config(&json).is_err());
    }

    #[test]
    fn rejects_duplicate_ids() {
        let json = r#"{ "tiles": [
            { "id": "a", "name": "A", "category": "apps", "launch": { "type": "url-app", "target": "https://a.com" } },
            { "id": "a", "name": "A2", "category": "apps", "launch": { "type": "url-app", "target": "https://b.com" } }
        ] }"#;
        assert!(parse_config(json).is_err());
    }

    #[test]
    fn rejects_typo_in_field_name() {
        let json = r#"{ "tiles": [
            { "id": "a", "nmae": "A", "category": "apps", "launch": { "type": "url-app", "target": "https://a.com" } }
        ] }"#;
        assert!(parse_config(json).is_err());
    }

    #[test]
    fn rejects_image_with_path() {
        let json = r#"{ "tiles": [
            { "id": "a", "name": "A", "category": "apps", "image": "../secret.png",
              "launch": { "type": "url-app", "target": "https://a.com" } }
        ] }"#;
        assert!(parse_config(json).is_err());
    }

        #[test]
    fn default_config_is_valid() {
        assert!(parse_config(DEFAULT_CONFIG).is_ok());
    }
}