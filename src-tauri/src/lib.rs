mod config;

use config::{Config, TileView};
use tauri::{Manager, State};

/// App-wide state: the loaded config, or the error explaining why it failed.
struct AppState {
    config: Result<Config, String>,
}

/// Returns display-only tile data. Never includes launch targets.
#[tauri::command]
fn get_tiles(state: State<'_, AppState>) -> Result<Vec<TileView>, String> {
    let config = state.config.as_ref().map_err(|e| e.clone())?;
    Ok(config.tiles.iter().map(TileView::from).collect())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let config = app
                .path()
                .app_config_dir()
                .map_err(|e| format!("Could not find the config folder: {e}"))
                .and_then(|dir| config::load_or_create(&dir));
            app.manage(AppState { config });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_tiles])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}