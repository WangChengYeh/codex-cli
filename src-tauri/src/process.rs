use anyhow::{anyhow, Result};
use serde::Serialize;
use std::{path::PathBuf, process::Stdio};
use tauri::{AppHandle, Manager};
use tokio::{
    io::{AsyncBufReadExt, BufReader},
    process::Command,
};
use uuid::Uuid;

#[derive(Serialize)]
#[serde(tag = "phase")]
enum Progress {
    Start { run_id: String },
    Stdout { run_id: String, chunk: String },
    Stderr { run_id: String, chunk: String },
    Done { run_id: String, code: i32 },
}

pub async fn run_command_emit(
    app: &AppHandle,
    args: Vec<String>,
    cwd: Option<String>,
) -> Result<String> {
    let run_id = Uuid::new_v4().to_string();
    app.emit_all(
        "command-progress",
        &Progress::Start {
            run_id: run_id.clone(),
        },
    )?;

    let (cmd, cmd_args) = if args.is_empty() {
        (
            "/bin/sh".to_string(),
            vec!["-lc".to_string(), "".to_string()],
        )
    } else {
        (args[0].clone(), args[1..].to_vec())
    };

    // Simple allowlist: allow common shells and a small set of programs.
    let allowed_basenames = ["zsh", "sh", "pwd", "ls", "cat", "echo", "git"];
    let path = PathBuf::from(&cmd);
    let base = path.file_name().and_then(|s| s.to_str()).unwrap_or(&cmd);
    if !(cmd.starts_with('/') || allowed_basenames.contains(&base)) {
        return Err(anyhow!("command not allowed").into());
    }

    // Lightweight redactor that avoids regex to keep offline builds simple.
    fn redact(s: &str) -> String {
        let patterns = ["api_key", "apikey", "secret", "password"];
        let mut out = s.to_string();
        for token in s.split_whitespace() {
            let low = token.to_lowercase();
            if token.contains('=') {
                for p in &patterns {
                    if low.contains(p) && token.contains('=') {
                        if let Some(pos) = out.find(token) {
                            let parts: Vec<&str> = token.splitn(2, '=').collect();
                            if parts.len() == 2 {
                                let replacement = format!("{}=[REDACTED]", parts[0]);
                                out.replace_range(pos..pos + token.len(), &replacement);
                            }
                        }
                    }
                }
            }
            // mask long hex-like tokens
            let stripped: String = token.chars().filter(|c| c.is_ascii_hexdigit()).collect();
            if stripped.len() >= 32 && token.chars().all(|c| c.is_ascii_hexdigit()) {
                if let Some(pos) = out.find(token) {
                    out.replace_range(pos..pos + token.len(), "[REDACTED]");
                }
            }
        }
        out
    }

    let mut command = Command::new(cmd);
    if !cmd_args.is_empty() {
        command.args(cmd_args);
    }
    if let Some(c) = cwd {
        command.current_dir(PathBuf::from(c));
    }
    command
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = command.spawn()?;
    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();

    let app_stdout = app.clone();
    let run_id_stdout = run_id.clone();
    tokio::spawn(async move {
        let mut reader = BufReader::new(stdout).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            let chunk = redact(&(line + "\n"));
            let _ = app_stdout.emit_all(
                "command-progress",
                &Progress::Stdout {
                    run_id: run_id_stdout.clone(),
                    chunk,
                },
            );
        }
    });

    let app_stderr = app.clone();
    let run_id_stderr = run_id.clone();
    tokio::spawn(async move {
        let mut reader = BufReader::new(stderr).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            let chunk = redact(&(line + "\n"));
            let _ = app_stderr.emit_all(
                "command-progress",
                &Progress::Stderr {
                    run_id: run_id_stderr.clone(),
                    chunk,
                },
            );
        }
    });

    let status = child.wait().await?;
    let code = status.code().unwrap_or_default();
    app.emit_all(
        "command-progress",
        &Progress::Done {
            run_id: run_id.clone(),
            code,
        },
    )?;
    Ok(run_id)
}
