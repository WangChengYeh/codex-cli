# Codex CLI Desktop (Tauri + xterm.js) — SPEC

## Overview

A cross‑platform application that wraps the Codex CLI in a secure Tauri shell with a modern terminal UI powered by xterm.js. Supports desktop and mobile targets with an adjusted runtime model for iOS/Android.

- Goal: Provide a fast, safe, and portable UI for the Codex CLI with first‑class terminal emulation, plan updates, and file‑scoped operations.
- Platforms: macOS, Windows, Linux, iOS, Android (x64/arm64 where supported by Tauri and deps).
- Tech stack: Tauri (Rust) backend, TypeScript frontend, xterm.js for terminal.
- Mobile runtime: On iOS use a remote engine (no local PTY); on Android local PTY is optional and device/OS‑dependent.

## Core Features

- Terminal: Embedded terminal via xterm.js backed by a native PTY.
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
  - IPC commands: PTY lifecycle, file ops, command runner, plan update.
  - PTY (desktop): cross‑platform via `portable-pty` (or `pty-process` alt) with async I/O.
  - PTY (mobile):
    - iOS — no on‑device PTY; use Remote Engine (see below).
    - Android — optional local PTY via platform shell (best‑effort; feature‑gated).
  - File sandbox: restrict to configured workspace folder via Tauri FS scope.
  - Command allowlist + optional “escalated” prompt workflow.
- Remote Engine (mobile and optional desktop)
  - A secure WebSocket JSON/RPC bridge to a Codex Engine running on a desktop/server.
  - Streams terminal data/events to xterm.js and proxies file/plan operations.
  - Auth via short‑lived token; TLS required with optional cert pinning.
- Processes
  - Single Tauri process hosts the Rust backend and WebView frontend.
  - One PTY process per active session (when local PTY is available).

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
  - `src/pty.rs` — PTY session management (spawn, write, resize, kill)
  - `src/fs.rs` — File read/write with scope checks
  - `src/plan.rs` — Plan model and updates
  - `tauri.conf.json` — Windows, allowlist, FS scope, CSP

Note: UI framework (React/Svelte/Vanilla) is optional; spec assumes minimal TS with modular panels.

## IPC Surface (Commands)

All commands return structured results with `ok`/`error` in Rust `Result<>` form; errors are surfaced with user‑friendly messages.

- `start_session(input?: string, cwd?: string): SessionId`
- `stop_session(session_id: string): void`
- `send_input(session_id: string, data: string): void`
- `resize_pty(session_id: string, cols: number, rows: number): void`
- `run_command(args: string[], cwd?: string, escalated?: boolean): RunId`
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
- Resize: Listen to container resize; call `fitAddon.fit()` then `resize_pty`.
- Links: URL recognition; modifier‑click behavior to open externally with confirmation.
 - Mobile: Virtual keyboard control; touch selection; long‑press context menu; disable WebGL on older WebViews.

## PTY Implementation (Rust)

- Desktop: Use `portable-pty` for cross‑platform spawning and resize.
- Android (feature `android-pty`): Attempt to spawn `/system/bin/sh` (or user shell) with PTY where allowed; fall back to Remote Engine if unsupported.
- iOS: No local PTY; always use Remote Engine.
- Async runtime: `tokio` for I/O; stream PTY output in small chunks to UI.
- Encoding: UTF‑8 with lossy fallback for safety.
- Cleanup: Kill child on window close or session stop; guard against zombies.

## Command Execution & Escalation

- Default: Non‑interactive commands run within the session’s PTY context or as a separate subprocess, scoped to workspace `cwd`.
- Escalation: When `escalated = true`, prompt user with a signed summary of the command and its effects; require explicit approval per run.
- Logging: Store minimal metadata (command, timestamps, exit code) locally; do not persist arguments containing secrets.
 - Remote: Commands proxied to the Remote Engine when local PTY is unavailable (mobile) or when explicitly chosen.

## File Access & Apply Patch

- Scope: Only paths under the configured workspace are allowed; normalize paths and reject symlinks pointing outside scope.
- Patch: Apply unified diffs (simplified patch format) via a Rust parser; produce a summary of changed files and hunks.
- Conflicts: If target files diverge, return a conflict error with hints; do not partially apply.

## Configuration

- `workspaceDir`: Absolute path to the allowed root for FS/commands.
- `shell`: Preferred shell for PTY (e.g., `/bin/zsh`, `powershell.exe`).
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
- Tauri prerequisites per OS (Xcode CLT on macOS, MSVC on Windows).
- iOS: Xcode (latest), CocoaPods, iOS target toolchains (`aarch64-apple-ios`, `x86_64-apple-ios` for simulator).
- Android: Android Studio/SDK+NDK, Java 17, Gradle, Rust targets (`aarch64-linux-android`, `armv7-linux-androideabi`, `x86_64-linux-android`).

Common scripts
- `pnpm install` — Install frontend deps
- Desktop: `pnpm tauri dev` | `pnpm tauri build`
- iOS: `pnpm tauri ios dev` | `pnpm tauri ios build`
- Android: `pnpm tauri android dev` | `pnpm tauri android build`

## Testing

- Rust: Unit tests for `pty`, `fs` scope checks, patch parser; integration tests for IPC.
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

- CI builds for macOS (.app/.dmg), Windows (.msi/.exe), Linux (.AppImage/.deb/.rpm as feasible).
- Mobile: iOS (.ipa via Xcode Archive/TestFlight), Android (.aab for Play Store, .apk for sideload).
- Codesigning and notarization/provisioning hooks configurable per platform.
- Auto‑update optional on desktop; mobile uses store updates.

## Limitations & Future Work

- True pseudo‑TTY parity varies by OS; advanced features depend on shell.
- iOS has no on‑device PTY; requires Remote Engine.
- Android PTY support varies by device/OS and permissions; remote fallback required.
- Sandboxed FS means external tools must operate inside workspace or via escrow flow.
- Future: Multi‑pane layout, split terminals, richer file diff viewer, plugin API, offline mobile engine via WASM where feasible.

---

This document describes the intended design and behaviors to guide implementation. Deviation from this spec should be documented with rationale.
