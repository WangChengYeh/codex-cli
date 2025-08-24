mod plan;
mod platform;
mod process;
mod session;

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{Manager, State};
use tokio::sync::Mutex;

struct AppState {
    plan: Mutex<plan::Plan>,
    workspace: PathBuf,
    sessions: session::SessionManager,
    platform_config: platform::PlatformConfig,
}

impl AppState {
    fn new() -> Self {
        Self {
            plan: Mutex::new(plan::Plan::default()),
            workspace: std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")),
            sessions: session::SessionManager::default(),
            platform_config: platform::get_platform_info(),
        }
    }
}

#[tauri::command]
async fn run_command(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    args: Vec<String>,
    cwd: Option<String>,
) -> Result<String, String> {
    // Check command against platform allowlist
    if let Some(cmd) = args.first() {
        if !state.platform_config.is_command_allowed(cmd) {
            return Err(format!("Command '{}' not allowed on this platform", cmd));
        }
    }

    process::run_command_emit(&app, args, cwd)
        .await
        .map_err(|e| e.to_string())
}

#[derive(Deserialize)]
struct PlanUpdateRequest {
    steps: Vec<plan::PlanStep>,
}

#[tauri::command]
fn update_plan(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    req: PlanUpdateRequest,
) -> Result<plan::Plan, String> {
    tauri::async_runtime::block_on(async {
        let mut plan_lock = state.plan.lock().await;
        plan_lock.update(req.steps).map_err(|e| e.to_string())?;
        let plan_clone = plan_lock.clone();
        // emit plan-updated event
        let _ = app.emit_all("plan-updated", serde_json::json!({ "plan": plan_clone }));
        Ok(plan_clone)
    })
}

#[tauri::command]
fn get_plan(state: State<'_, AppState>) -> Result<plan::Plan, String> {
    tauri::async_runtime::block_on(async { Ok(state.plan.lock().await.clone()) })
}

#[tauri::command]
fn read_file(state: State<'_, AppState>, path: String) -> Result<String, String> {
    let root = &state.workspace;
    let pb = PathBuf::from(&path);
    let canon = std::fs::canonicalize(&pb).map_err(|e| e.to_string())?;
    let canon_root = std::fs::canonicalize(root).map_err(|e| e.to_string())?;
    if !canon.starts_with(&canon_root) {
        return Err("read_file: path outside workspace".into());
    }
    std::fs::read_to_string(&canon).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file(state: State<'_, AppState>, path: String, content: String) -> Result<(), String> {
    let root = &state.workspace;
    let pb = PathBuf::from(&path);
    let parent = pb.parent().ok_or_else(|| "invalid path".to_string())?;
    let canon_parent = std::fs::canonicalize(parent).map_err(|e| e.to_string())?;
    let canon_root = std::fs::canonicalize(root).map_err(|e| e.to_string())?;
    if !canon_parent.starts_with(&canon_root) {
        return Err("write_file: path outside workspace".into());
    }
    std::fs::write(&pb, content).map_err(|e| e.to_string())
}

#[derive(Deserialize)]
struct StartSessionRequest {
    input: Option<String>,
    cwd: Option<String>,
}

#[tauri::command]
async fn start_session(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    req: StartSessionRequest,
) -> Result<String, String> {
    state
        .sessions
        .start(&app, req.input.unwrap_or_default(), req.cwd)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn send_input(
    state: State<'_, AppState>,
    session_id: String,
    data: String,
) -> Result<(), String> {
    state
        .sessions
        .send(&session_id, data)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn stop_session(state: State<'_, AppState>, session_id: String) -> Result<(), String> {
    state
        .sessions
        .stop(&session_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn resize_view(_session_id: String, _cols: u32, _rows: u32) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
fn get_workspace(state: State<'_, AppState>) -> Result<String, String> {
    Ok(state.workspace.to_string_lossy().to_string())
}

#[tauri::command]
fn get_platform_info(state: State<'_, AppState>) -> Result<platform::PlatformConfig, String> {
    Ok(state.platform_config.clone())
}

#[derive(Deserialize)]
struct ApplyPatchRequest {
    patch: String,
}

#[derive(Serialize)]
struct ApplyPatchResponse {
    summary: String,
}

#[tauri::command]
fn apply_patch(
    _state: State<'_, AppState>,
    req: ApplyPatchRequest,
) -> Result<ApplyPatchResponse, String> {
    // Minimal validator for the patch envelope; does not modify files in this MVP.
    let has_begin = req.patch.contains("*** Begin Patch");
    let has_end = req.patch.contains("*** End Patch");
    if !has_begin || !has_end {
        return Err("invalid patch format".into());
    }
    Ok(ApplyPatchResponse {
        summary: "validated patch (no-op)".into(),
    })
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            // process/command
            run_command,
            // plan
            update_plan,
            get_plan,
            // files
            read_file,
            write_file,
            get_workspace,
            apply_patch,
            // sessions
            start_session,
            send_input,
            stop_session,
            resize_view,
            // platform
            get_platform_info
        ])
        .plugin(tauri_plugin_log::Builder::default().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
