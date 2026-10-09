mod config;
mod launch;

use config::{Config, TileView};
use tauri::{AppHandle, Manager, State};

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

/// Launches a tile by id. The frontend only sends the id;
/// what actually gets launched comes from the config.
#[tauri::command]
fn launch_tile(app: AppHandle, state: State<'_, AppState>, id: String) -> Result<(), String> {
    let config = state.config.as_ref().map_err(|e| e.clone())?;
    let tile = config
        .tiles
        .iter()
        .find(|tile| tile.id == id)
        .ok_or_else(|| format!("Unknown tile: {id}"))?;
    launch::launch(&app, &tile.launch)
}

/// Brings the launcher window to the front, restoring it if it was minimized.
fn focus_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
       tauri::Builder::default()
        // Must be registered first, per the plugin docs.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            focus_main_window(app);
        }))
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let config = app
                .path()
                .app_config_dir()
                .map_err(|e| format!("Could not find the config folder: {e}"))
                .and_then(|dir| config::load_or_create(&dir));
            app.manage(AppState { config });
                        // Only register autostart for the installed (release) build.
            // In development the app runs from a debug build that needs the
            // Vite dev server, so autostarting it at login would show a blank window.
            #[cfg(not(debug_assertions))]
            {
                use tauri_plugin_autostart::ManagerExt;
                if let Err(e) = app.autolaunch().enable() {
                    eprintln!("Could not enable autostart: {e}");
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_tiles, launch_tile])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}