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
    }
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