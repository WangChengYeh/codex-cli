use anyhow::{anyhow, Result};
use serde::Serialize;
use std::{collections::HashMap, path::PathBuf};
use tauri::AppHandle;
use tokio::{io::{AsyncBufReadExt, AsyncWriteExt, BufReader}, process::{Child, ChildStdin, Command}, sync::Mutex};
use uuid::Uuid;
// Lightweight redactor without regex for offline builds.
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
    let stripped: String = token.chars().filter(|c| c.is_ascii_hexdigit()).collect();
    if stripped.len() >= 32 && token.chars().all(|c| c.is_ascii_hexdigit()) {
      if let Some(pos) = out.find(token) {
        out.replace_range(pos..pos + token.len(), "[REDACTED]");
      }
    }
  }
  out
}

#[derive(Default)]
pub struct SessionManager {
  inner: Mutex<HashMap<String, SessionHandle>>,
}

struct SessionHandle {
  child: Child,
  stdin: Mutex<Option<ChildStdin>>,
}

#[derive(Serialize)]
struct SessionDataEvent<'a> {
  session_id: &'a str,
  data: String,
  stream: &'a str,
}

#[derive(Serialize)]
struct SessionExitEvent<'a> {
  session_id: &'a str,
  code: i32,
}

impl SessionManager {
  pub async fn start(&self, app: &AppHandle, input: String, cwd: Option<String>) -> Result<String> {
    let session_id = Uuid::new_v4().to_string();

    // For MVP, start a simple echo pipeline using `cat` to demonstrate stdio.
    // On macOS, use zsh to run `cat` to ensure consistent behavior without PTY.
    let mut cmd = Command::new("/bin/zsh");
    cmd.arg("-lc").arg("cat");
    if let Some(c) = cwd { cmd.current_dir(PathBuf::from(c)); }
    let mut child = cmd.stdin(std::process::Stdio::piped())
      .stdout(std::process::Stdio::piped())
      .stderr(std::process::Stdio::piped())
      .spawn()?;

    let stdout = child.stdout.take().ok_or_else(|| anyhow!("stdout unavailable"))?;
    let stderr = child.stderr.take().ok_or_else(|| anyhow!("stderr unavailable"))?;
    let stdin = child.stdin.take();

    // register handle
    let handle = SessionHandle { child, stdin: Mutex::new(stdin) };
    {
      let mut map = self.inner.lock().await;
      map.insert(session_id.clone(), handle);
    }

    // emit data streams
    let app_stdout = app.clone();
    let sid_out = session_id.clone();
    tokio::spawn(async move {
      let mut reader = BufReader::new(stdout).lines();
      while let Ok(Some(line)) = reader.next_line().await {
        let data = redact(&(line.to_string() + "\n"));
        let _ = app_stdout.emit_all(
          "session-data",
          &SessionDataEvent { session_id: &sid_out, data, stream: "stdout" },
        );
      }
    });

    let app_stderr = app.clone();
    let sid_err = session_id.clone();
    tokio::spawn(async move {
      let mut reader = BufReader::new(stderr).lines();
      while let Ok(Some(line)) = reader.next_line().await {
        let data = redact(&(line.to_string() + "\n"));
        let _ = app_stderr.emit_all(
          "session-data",
          &SessionDataEvent { session_id: &sid_err, data, stream: "stderr" },
        );
      }
    });

    // optional initial input
    if !input.is_empty() {
      let _ = self.send(&session_id, input).await;
    }

    // monitor exit
    let app_exit = app.clone();
    let sid_exit = session_id.clone();
    let mgr = self.inner.clone();
    tokio::spawn(async move {
      let code = {
        let mut map = mgr.lock().await;
        if let Some(mut handle) = map.remove(&sid_exit) {
          match handle.child.wait().await {
            Ok(status) => status.code().unwrap_or_default(),
            Err(_) => 255,
          }
        } else {
          255
        }
      };
      let _ = app_exit.emit_all("session-exit", &SessionExitEvent { session_id: &sid_exit, code });
    });

    Ok(session_id)
  }

  pub async fn send(&self, session_id: &str, data: String) -> Result<()> {
    let map = self.inner.lock().await;
    let handle = map.get(session_id).ok_or_else(|| anyhow!("unknown session"))?;
    let mut stdin_lock = handle.stdin.lock().await;
    if let Some(stdin) = stdin_lock.as_mut() {
      stdin.write_all(data.as_bytes()).await?;
      stdin.flush().await?;
      Ok(())
    } else {
      Err(anyhow!("stdin closed"))
    }
  }

  pub async fn stop(&self, session_id: &str) -> Result<()> {
    let mut map = self.inner.lock().await;
    if let Some(handle) = map.remove(session_id) {
      #[cfg(unix)]
      {
        use tokio::process::Child;
        let _ = handle.child.start_kill();
      }
      #[cfg(not(unix))]
      {
        let _ = handle.child.kill();
      }
      Ok(())
    } else {
      Err(anyhow!("unknown session"))
    }
  }
}
