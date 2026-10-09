mod config;
mod launch;

use config::{Config, TileView};
use tauri::{AppHandle, Manager, State};
use std::path::PathBuf;
use std::sync::Mutex;

/// App-wide state shared by all commands.
struct AppState {
    /// Folder holding tiles.json and images/ (None if Windows couldn't provide it).
    config_dir: Option<PathBuf>,
    /// The loaded config, or the error explaining why loading failed.
    config: Mutex<Result<Config, String>>,
}

/// Returns display-only tile data. Never includes launch targets.
#[tauri::command]
fn get_tiles(state: State<'_, AppState>) -> Result<Vec<TileView>, String> {
    let guard = state.config.lock().map_err(|_| "Config is unavailable".to_string())?;
    let config = guard.as_ref().map_err(|e| e.clone())?;
    let dir = state.config_dir.as_ref().ok_or("Config folder not found")?;
    let images_dir = dir.join("images");
    Ok(config.tiles.iter().map(|tile| TileView::new(tile, &images_dir)).collect())
}

/// Launches a tile by id. The frontend only sends the id;
/// what actually gets launched comes from the config.
#[tauri::command]
fn launch_tile(app: AppHandle, state: State<'_, AppState>, id: String) -> Result<(), String> {
    // Copy the launch info out, then release the lock before launching.
    let launch = {
        let guard = state.config.lock().map_err(|_| "Config is unavailable".to_string())?;
        let config = guard.as_ref().map_err(|e| e.clone())?;
        config
            .tiles
            .iter()
            .find(|tile| tile.id == id)
            .map(|tile| tile.launch.clone())
            .ok_or_else(|| format!("Unknown tile: {id}"))?
    };
    launch::launch(&app, &launch)
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
                   let config_dir = app.path().app_config_dir().ok();
            let config = match &config_dir {
                Some(dir) => config::load_or_create(dir),
                None => Err("Could not find the config folder".to_string()),
            };
            app.manage(AppState {
                config_dir,
                config: Mutex::new(config),
            });
                        // Global "Home" hotkey: Ctrl+Alt+Home brings the launcher
            // to the front from anywhere, even while another app is open.
            {
                use tauri_plugin_global_shortcut::{
                    Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState,
                };

                let home = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::Home);

                app.handle().plugin(
                    tauri_plugin_global_shortcut::Builder::new()
                        .with_handler(move |app, shortcut, event| {
                            if shortcut == &home && matches!(event.state(), ShortcutState::Pressed) {
                                focus_main_window(app);
                            }
                        })
                        .build(),
                )?;

                if let Err(e) = app.global_shortcut().register(home) {
                    eprintln!("Could not register Ctrl+Alt+Home: {e}");
                }
            }
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