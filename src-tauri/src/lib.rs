mod config;
mod launch;
mod settings;

use config::{Config, TileView};
use tauri::{AppHandle, Manager, State};
use std::path::PathBuf;
use std::sync::Mutex;
use settings::{ExeTokens, PickedExe, SettingsTile, TileEdit};

struct AppState {
    /// Folder holding tiles.json and images/ (None if Windows couldn't provide it).
    config_dir: Option<PathBuf>,
    /// The loaded config, or the error explaining why loading failed.
    config: Mutex<Result<Config, String>>,
    /// Exe paths the Settings screen may refer to, by token.
    exe_tokens: Mutex<ExeTokens>,
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

/// Full tile data for the Settings screen. Exe paths are display-only;
/// exe tiles are referred to by token.
#[tauri::command]
fn get_settings_tiles(state: State<'_, AppState>) -> Result<Vec<SettingsTile>, String> {
    let guard = state.config.lock().map_err(|_| "Config is unavailable".to_string())?;
    let config = guard.as_ref().map_err(|e| e.clone())?;
    let mut tokens = state.exe_tokens.lock().map_err(|_| "Settings are unavailable".to_string())?;
    *tokens = ExeTokens::default(); // start fresh each time Settings opens
    Ok(settings::to_settings_tiles(config, &mut tokens))
}

/// Opens the Windows file picker for .exe files. Returns None if cancelled.
#[tauri::command]
async fn pick_exe(app: AppHandle, state: State<'_, AppState>) -> Result<Option<PickedExe>, String> {
    use tauri_plugin_dialog::DialogExt;

    let Some(file) = app
        .dialog()
        .file()
        .add_filter("Programs", &["exe"])
        .blocking_pick_file()
    else {
        return Ok(None); // the user closed the dialog
    };

    let path = file
        .into_path()
        .map_err(|e| format!("Invalid file: {e}"))?
        .to_string_lossy()
        .into_owned();

    let token = state
        .exe_tokens
        .lock()
        .map_err(|_| "Settings are unavailable".to_string())?
        .issue(path.clone());

    Ok(Some(PickedExe { token, path }))
}

/// Validates and saves edited tiles, then updates the running app.
#[tauri::command]
fn save_tiles(state: State<'_, AppState>, tiles: Vec<TileEdit>) -> Result<(), String> {
    let dir = state.config_dir.as_ref().ok_or("Config folder not found")?;
    let mut guard = state.config.lock().map_err(|_| "Config is unavailable".to_string())?;
    let tokens = state.exe_tokens.lock().map_err(|_| "Settings are unavailable".to_string())?;

    let new_config = settings::from_edits(tiles, &tokens)?;
    config::save_config(dir, &new_config)?; // validates, backs up, writes safely
    *guard = Ok(new_config); // only update memory once the file is saved
    Ok(())
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
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
                   let config_dir = app.path().app_config_dir().ok();
            let config = match &config_dir {
                Some(dir) => config::load_or_create(dir),
                None => Err("Could not find the config folder".to_string()),
            };
                       app.manage(AppState {
                config_dir,
                config: Mutex::new(config),
                exe_tokens: Mutex::new(ExeTokens::default()),
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
        .invoke_handler(tauri::generate_handler![get_tiles, launch_tile,  get_settings_tiles, pick_exe, save_tiles])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}