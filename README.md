# Codex CLI Desktop (Tauri + xterm.js) — SPEC

## Overview

A cross‑platform application that wraps the Codex CLI in a secure Tauri shell with a modern terminal UI powered by xterm.js. Initial focus is macOS desktop, with iOS next; Windows/Linux/Android are planned.

- Goal: Provide a fast, safe, and portable UI for the Codex CLI with first‑class terminal emulation, plan updates, and file‑scoped operations.
- Platforms: Supported now — macOS. Next — iOS. Planned — Windows, Linux, Android.
- Tech stack: Tauri (Rust) backend, TypeScript frontend, xterm.js for terminal.
- Mobile runtime: Uses a Remote Engine where needed; no PTY anywhere — all platforms operate via stdio pipes.

## Core Features

- Terminal: xterm.js rendering of subprocess stdio streams (no PTY on any platform).
- Sessions: Create/stop Codex CLI sessions; persist basic session metadata.
- Plans: View/update a live “Plan” panel reflecting steps and status.
- Files: Read/write limited to a configured workspace directory.
- Commands: Run shell commands with safe defaults; explicit escalation flow.
- Events: Real‑time streaming of stdout/stderr, status, and progress.
- UX: Keyboard shortcuts for common actions, resizable panes, search, copy/paste.

## Architecture

- Frontend (TS/HTML/CSS)
  - `xterm.js` with addons: fit, webgl (optional), search, links.
  - Panels: Terminal, Plan, Sidebar (sessions/files), Status bar.
  - IPC layer (`@tauri-apps/api`) for commands/events.
- Backend (Rust, Tauri)
  - IPC commands: Session/process lifecycle, file ops, command runner, plan update.
  - Process I/O: Subprocess management via stdio pipes only; no PTY usage on any platform.
  - File sandbox: restrict to configured workspace folder via Tauri FS scope.
  - Command allowlist + optional “escalated” prompt workflow.
- Remote Engine (mobile and optional desktop)
  - A secure WebSocket JSON/RPC bridge to a Codex Engine running on a desktop/server.
  - Streams terminal data/events to xterm.js and proxies file/plan operations.
  - Auth via short‑lived token; TLS required with optional cert pinning.
- Processes
  - Single Tauri process hosts the Rust backend and WebView frontend.
  - One subprocess per active session (stdio pipes; no PTY).

## Security Model

- Allowlist: Tauri command allowlist only exposes vetted IPC.
- FS scope: Reads/writes restricted to the workspace directory tree.
- No remote content: Frontend served from local assets. CSP locked down.
- Shell guardrails: Disallow destructive commands outside workspace.
- Escalation: Explicit user approval dialog for privileged operations.
- Secrets: Never log sensitive values; redact in UI and logs.
- Remote engine: TLS only; token‑based auth; optional certificate pinning on mobile.

## Project Structure

- `/src` — Frontend source (TypeScript, UI, xterm integration)
  - `main.ts` — App bootstrap; window init; IPC wiring
  - `terminal/` — xterm setup, addons, fit/resize, clipboard
  - `panels/PlanPanel.tsx` — View/edit of plan steps (framework‑agnostic placeholder)
  - `api.ts` — Typed wrappers for Tauri commands/events
- `/src-tauri` — Tauri Rust backend
  - `src/main.rs` — Tauri app init, plugin setup, command registration
  - `src/ipc.rs` — IPC handlers (commands/events)
  - `src/process.rs` — Subprocess session management (spawn, stdin write, signals, kill)
  - `src/fs.rs` — File read/write with scope checks
  - `src/plan.rs` — Plan model and updates
  - `tauri.conf.json` — Windowing, allowlist, FS scope, CSP

Note: UI framework (React/Svelte/Vanilla) is optional; spec assumes minimal TS with modular panels.

## IPC Surface (Commands)

All commands return structured results with `ok`/`error` in Rust `Result<>` form; errors are surfaced with user‑friendly messages.

- `start_session(input?: string, cwd?: string): SessionId` (creates a stdio‑pipe session; not a TTY)
- `stop_session(session_id: string): void`
- `send_input(session_id: string, data: string): void`
- `resize_view(session_id: string, cols: number, rows: number): void` (UI only; process does not receive TTY resize)
- `run_command(args: string[], cwd?: string, escalated?: boolean): RunId` (runs with stdio pipes; no TTY)
- `read_file(path: string): { content: string }` (scoped)
- `write_file(path: string, content: string): void` (scoped)
- `apply_patch(patch: string): { summary: string }` (scoped, validates format)
- `update_plan(steps: PlanStep[]): Plan` (validates single in‑progress rule)
- `get_plan(): Plan`
- `get_workspace(): string`

Remote (mobile/optional desktop)
- `connect_remote(url: string, token: string): void`
- `disconnect_remote(): void`
- `remote_status(): { connected: boolean, url?: string }`


## Events (Emitted)

- `session-data` — `{ sessionId, data, stream: 'stdout'|'stderr' }`
- `session-exit` — `{ sessionId, code, signal? }`
- `command-progress` — `{ runId, phase: 'start'|'stdout'|'stderr'|'done', chunk? }`
- `plan-updated` — `{ plan }`
- `status` — `{ level: 'info'|'warn'|'error', message }`
 - `remote-connection` — `{ state: 'connecting'|'connected'|'disconnected'|'error', reason? }`

## Data Models

- `PlanStep` — `{ id, step, status: 'pending'|'in_progress'|'completed' }`
- `Plan` — `{ steps: PlanStep[] }` with validation: exactly one `in_progress` unless all completed.
- `Session` — `{ id, cwd, createdAt, state }`

## xterm.js Configuration

- Addons: `FitAddon`, `SearchAddon`, `WebglAddon` (fallback to canvas), `WebLinksAddon`.
- Theme: Respect OS theme; custom palette tokens; high‑contrast option.
- Font: Monospace configurable; ligatures optional.
- Clipboard: Native copy/paste; bracketed paste; Ctrl/Cmd+C/V behavior.
- Resize: Listen to container resize; call `fitAddon.fit()` (UI only; no process resize event is sent).
- Links: URL recognition; modifier‑click behavior to open externally with confirmation.
 - Mobile: Virtual keyboard control; touch selection; long‑press context menu; disable WebGL on older WebViews.

## Process I/O (No PTY)

- Model: All platforms use stdio pipes for subprocess I/O; no PTY allocation or TTY semantics.
- Shell: Commands may be invoked via a configured shell (e.g., `/bin/zsh -lc` or `powershell -NoProfile -Command`), still without a TTY.
- Async runtime: `tokio` for non‑blocking pipes; stream output to UI in small chunks.
- Encoding: UTF‑8 with lossy fallback for safety.
- Cleanup: Kill child on window close or session stop; guard against zombies.
- Signals: Limited signal handling (e.g., SIGINT/CTRL_C_EVENT) where supported; no job control.

## Command Execution & Escalation

- Default: Commands run as subprocesses using stdio pipes, scoped to workspace `cwd`; no TTY is provided.
- Escalation: When `escalated = true`, prompt user with a signed summary of the command and its effects; require explicit approval per run.
- Logging: Store minimal metadata (command, timestamps, exit code) locally; do not persist arguments containing secrets.
 - Remote: Commands may be proxied to a Remote Engine (also stdio‑based) when chosen or required by platform policy.

## File Access & Apply Patch

- Scope: Only paths under the configured workspace are allowed; normalize paths and reject symlinks pointing outside scope.
- Patch: Apply unified diffs (simplified patch format) via a Rust parser; produce a summary of changed files and hunks.
- Conflicts: If target files diverge, return a conflict error with hints; do not partially apply.

## Configuration

- `workspaceDir`: Absolute path to the allowed root for FS/commands.
- `shell`: Preferred command interpreter for subprocess execution (no TTY).
- `terminal`: Font settings, cursor style, theme (light/dark/system), scrollback.
- `security`: Allowlist overrides, escalation policy (on‑request/never).
- Storage: Persist in Tauri `AppConfigDir` as JSON; load on startup with schema validation.
 - `remote`: `{ url, token, certPin? }` for mobile/remote mode.

## Keyboard Shortcuts

- `Ctrl/Cmd+Shift+T`: New session
- `Ctrl/Cmd+W`: Close session
- `Ctrl/Cmd+K`: Clear terminal
- `Ctrl/Cmd+F`: Search in terminal
- `Ctrl/Cmd+,`: Preferences
 - Mobile gestures: two‑finger tap = context menu; long‑press = copy/paste; pinch to resize font.

## Build & Development

Prerequisites
- Rust toolchain (stable), `cargo`.
- Node.js 18+, package manager (pnpm/npm/yarn).
- macOS: Xcode Command Line Tools, Tauri prerequisites.
- iOS (next): Xcode (latest), CocoaPods, iOS Rust targets (`aarch64-apple-ios`, `x86_64-apple-ios` for simulator).

Common scripts
- `pnpm install` — Install frontend deps
- macOS Desktop: `pnpm tauri dev` | `pnpm tauri build`
- iOS (next): `pnpm tauri ios dev` | `pnpm tauri ios build`

## Testing

- Rust: Unit tests for process stdio handling, `fs` scope checks, patch parser; integration tests for IPC.
- Frontend: Component tests for panels; terminal behavior smoke tests (fit, paste, links).
- E2E: Scripted session flow (start → run command → update plan → stop) via Spectron‑like harness or `tauri-driver` where applicable.

### User Test (macOS) — MCP Browser

An optional end‑to‑end smoke test to validate the desktop user experience on a Mac.

Prereqs
- Built macOS app (`pnpm tauri build`) or running dev build (`pnpm tauri dev`).
- MCP Browser installed on macOS (download the latest universal build from its releases page).

Steps
1) Launch the app (dev: `pnpm tauri dev`, or open the built `.app`).
2) In the app, create a new session and confirm the terminal renders and accepts input.
3) Open MCP Browser and keep it alongside the app to mimic a user running external tools.
4) In the app, run basic commands in the terminal: `pwd`, `ls`, and a no‑op script.
5) Trigger a file read/write inside the configured workspace via the app UI.
6) Update the Plan panel (add, mark in_progress, complete) and observe live updates.
7) Attempt an escalated command from the app; verify the explicit approval flow appears.
8) Try an out‑of‑scope file path; confirm it is blocked with a clear error.

Expected
- Terminal I/O is streamed without visual artifacts; resize maintains layout.
- File operations are restricted to the workspace and succeed within scope.
- Plan updates enforce exactly one `in_progress` step when not fully completed.
- Escalated actions require an explicit approval; errors are informative and redacted.
- The app remains responsive with MCP Browser running in parallel.

## Accessibility

- Terminal: Respect system font size and contrast; expose copy/paste via menu.
- Panels: Keyboard navigable; ARIA roles/labels; focus outlines.

## Packaging & Release

- Initial: CI builds for macOS (.app/.dmg).
- Next: iOS (.ipa via Xcode Archive/TestFlight).
- Future: Windows (.msi/.exe) and Linux (.AppImage/.deb/.rpm) as feasible; Android (.aab/.apk).
- Codesigning and notarization/provisioning hooks configurable per platform.
- Auto‑update optional on desktop; mobile uses store updates.

## Limitations & Future Work

- No TTY: Full‑screen TUIs (e.g., `vim`, `top`), job control, and programs requiring a real terminal are unsupported.
- Shell behavior: Without a TTY, some prompts and interactive flows may not function.
- iOS: Remote Engine may still be required by platform policy, but remains stdio‑based.
- Sandboxed FS: External tools must operate inside workspace or via escrow flow.
- Future: Optional TTY emulation layer for limited interactive support; multi‑pane layout; richer file diff viewer; plugin API; offline mobile engine via WASM where feasible.

---

This document describes the intended design and behaviors to guide implementation. Deviation from this spec should be documented with rationale.
