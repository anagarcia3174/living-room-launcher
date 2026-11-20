use crate::config::Launch;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::{AppHandle, Manager};
use tauri_plugin_opener::OpenerExt;

/// Launches a tile's target. Only called with launch info from the validated config.
pub fn launch(app: &AppHandle, launch: &Launch) -> Result<(), String> {
    match launch {
        Launch::Exe(path) => launch_exe(path),
        Launch::UrlApp(url) => launch_url_app(app, url),
        Launch::Protocol(url) => app
            .opener()
            .open_url(url, None::<&str>)
            .map_err(|e| format!("Could not open {url}: {e}")),
        Launch::SteamGame(app_id) => launch_steam_game(app, app_id),
        Launch::PrismInstance(instance) => launch_prism_instance(instance),
    }
}

/// Starts a Steam game without showing the Steam window.
/// `-silent` starts Steam minimized to the tray if it isn't running yet; if it
/// already is, the request is simply passed on to it. Most Steam games need Steam
/// running in the background, so this is the closest to "just the game".
/// `app_id` is digits only (checked when the config loads).
fn launch_steam_game(app: &AppHandle, app_id: &str) -> Result<(), String> {
    match find_steam() {
        Some(steam) => Command::new(steam)
            .arg("-silent")
            .arg("-applaunch")
            .arg(app_id)
            .spawn()
            .map(|_| ())
            .map_err(|e| format!("Could not start Steam: {e}")),
        // Non-standard install: fall back to the steam:// link (Steam may show its window).
        None => {
            let url = format!("steam://rungameid/{app_id}");
            app.opener()
                .open_url(&url, None::<&str>)
                .map_err(|e| format!("Could not open {url}: {e}"))
        }
    }
}

/// Starts a Minecraft instance straight from Prism Launcher (no launcher menu).
/// `instance` is a safe instance id (checked when the config loads), passed as a
/// single argument with no shell.
fn launch_prism_instance(instance: &str) -> Result<(), String> {
    let prism = find_prism().ok_or(
        "Prism Launcher was not found. Install it for this Windows user, or tell me where it is.",
    )?;

    let mut command = Command::new(&prism);
    command.arg("--launch").arg(instance);
    if let Some(folder) = prism.parent() {
        command.current_dir(folder);
    }
    command
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("Could not start Prism Launcher: {e}"))
}

/// Looks for steam.exe in the standard install locations.
fn find_steam() -> Option<PathBuf> {
    ["ProgramFiles(x86)", "ProgramFiles"]
        .iter()
        .filter_map(|var| std::env::var_os(var))
        .map(|base| PathBuf::from(base).join(r"Steam\steam.exe"))
        .find(|path| path.is_file())
}

/// Looks for prismlauncher.exe: the per-user installer location first, then Program Files.
fn find_prism() -> Option<PathBuf> {
    [
        ("LOCALAPPDATA", r"Programs\PrismLauncher\prismlauncher.exe"),
        ("ProgramFiles", r"PrismLauncher\prismlauncher.exe"),
        ("ProgramFiles(x86)", r"PrismLauncher\prismlauncher.exe"),
    ]
    .iter()
    .filter_map(|(var, rest)| std::env::var_os(var).map(|base| PathBuf::from(base).join(rest)))
    .find(|path| path.is_file())
}

/// Starts an .exe directly (no shell), with its own folder as the working directory.
fn launch_exe(path: &str) -> Result<(), String> {
    let exe = Path::new(path);
    if !exe.is_file() {
        return Err(format!("Program not found: {path}"));
    }

    let mut command = Command::new(exe);
    if let Some(folder) = exe.parent() {
        command.current_dir(folder); // many games expect this
    }
    command
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("Could not start {path}: {e}"))
}

/// Opens a website in its own fullscreen Edge app window (no tabs or address bar).
fn launch_url_app(app: &AppHandle, url: &str) -> Result<(), String> {
    let edge = find_edge().ok_or("Microsoft Edge was not found")?;

    // A dedicated Edge profile just for the launcher. It runs as its own Edge
    // process, so these options always apply, even if Edge is already open.
    let profile = app
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("Could not find the app data folder: {e}"))?
        .join("edge-profile");

    Command::new(edge)
        .arg(format!("--user-data-dir={}", profile.display()))
        .arg("--start-fullscreen")
        .arg("--no-first-run")
        .arg("--no-default-browser-check")
        .arg(format!("--app={url}"))
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("Could not open Edge: {e}"))
}

/// Looks for msedge.exe in the standard install locations.
fn find_edge() -> Option<PathBuf> {
    ["ProgramFiles(x86)", "ProgramFiles"]
        .iter()
        .filter_map(|var| std::env::var_os(var))
        .map(|base| PathBuf::from(base).join(r"Microsoft\Edge\Application\msedge.exe"))
        .find(|path| path.is_file())
}