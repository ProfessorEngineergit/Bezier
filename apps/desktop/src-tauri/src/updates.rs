//! The beta channel's updates. The updater plugin's own check reads the address in
//! tauri.conf.json, the newest stable release; the page cannot give it another one. On beta the
//! page asks here instead, and the same plugin reads the beta channel's `latest.json`, checks the
//! package against the key built into the app, and installs it.

use std::sync::Mutex;

use tauri::{AppHandle, Emitter, State, Url};
use tauri_plugin_updater::{Update, UpdaterExt};

/// Kept current by every beta and stable release (`.github/workflows/release.yml`).
const BETA_MANIFEST: &str =
    "https://github.com/ProfessorEngineergit/Bezier/releases/download/beta-channel/latest.json";

/// The update found by the last check, until it is installed.
#[derive(Default)]
pub struct Pending(Mutex<Option<Update>>);

/// Looks for a newer version on the beta channel: its version, notes and date, or null.
#[tauri::command]
pub async fn check_beta_update(
    app: AppHandle,
    pending: State<'_, Pending>,
) -> Result<Option<serde_json::Value>, String> {
    let url: Url = BETA_MANIFEST.parse().map_err(|error| format!("{error}"))?;
    let update = app
        .updater_builder()
        .endpoints(vec![url])
        .map_err(|error| error.to_string())?
        .build()
        .map_err(|error| error.to_string())?
        .check()
        .await
        .map_err(|error| error.to_string())?;
    let found = update.as_ref().map(|update| {
        serde_json::json!({
            "version": update.version,
            "body": update.body,
            "date": update.date.map(|date| date.to_string()),
        })
    });
    *pending.0.lock().map_err(|error| error.to_string())? = update;
    Ok(found)
}

/// Downloads and installs the update the last check found, telling the page how far it is
/// (`bezier:update-progress`, bytes received and the total when known). The page restarts the app.
#[tauri::command]
pub async fn install_beta_update(
    app: AppHandle,
    pending: State<'_, Pending>,
) -> Result<(), String> {
    let update = pending
        .0
        .lock()
        .map_err(|error| error.to_string())?
        .take()
        .ok_or_else(|| "no update was found".to_owned())?;
    let mut received: u64 = 0;
    update
        .download_and_install(
            |chunk, total| {
                received += chunk as u64;
                let _ = app.emit("bezier:update-progress", (received, total));
            },
            || {},
        )
        .await
        .map_err(|error| error.to_string())
}
