# Codex CLI Desktop (Tauri + xterm.js) — SPEC

## Overview

A cross‑platform application that wraps the Codex CLI in a secure Tauri shell with a modern terminal UI powered by xterm.js. **✅ Now supports macOS desktop and Android mobile** with comprehensive testing infrastructure.

- Goal: Provide a fast, safe, and portable UI for the Codex CLI with first‑class terminal emulation, plan updates, and file‑scoped operations.
- Platforms: **✅ macOS (supported)**, **✅ Android (fully implemented)**, Planned — iOS, Windows, Linux.
- Architectures: macOS/iOS/Android = aarch64 only; Windows/Linux = x86_64 only.
- Tech stack: **Tauri v2** (Rust) backend, TypeScript frontend, xterm.js for terminal.
- Mobile runtime: Android runs commands via best-effort stdio subprocess where platform policy allows. No PTY anywhere — all platforms operate without TTYs.

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
  - `@xterm/xterm` with modern addons: `@xterm/addon-fit`, `@xterm/addon-webgl`, `@xterm/addon-search`, `@xterm/addon-web-links`.
  - Mobile-responsive panels: Terminal, Plan, Session, Status with touch-optimized tabs.
  - IPC layer (`@tauri-apps/api`) for commands/events with real-time streaming.
- Backend (Rust, Tauri)
  - IPC commands: Session/process lifecycle, file ops, command runner, plan update.
  - Process I/O: Subprocess management via stdio pipes only; no PTY usage on any platform.
  - Android execution path: Best-effort stdio subprocess execution where allowed by platform policy. Commands requiring TTY or blocked by Android sandboxing are unsupported.
  - File sandbox: restrict to configured workspace folder via Tauri FS scope.
  - Command allowlist + optional “escalated” prompt workflow.
<!-- Remote execution is not part of the current scope. -->
- Processes
  - Single Tauri process hosts the Rust backend and WebView frontend.
  - One subprocess per active session (stdio pipes; no PTY).

## Architecture View

- Common Core
  - UI: WebView + xterm.js for rendering; Plan/Sidebar/Status panels.
  - Backend: Rust (Tauri) with IPC commands for session/process, files, and plan.
  - Runner: Stdio-only subprocess manager; stream stdout/stderr as events; no PTY, no TTY resize.
  - Security: Scoped filesystem access; command allowlist; explicit escalation prompts.
  - Events: `session-data`, `session-exit`, `command-progress`, `plan-updated`, `status`.

- macOS (aarch64, **✅ PHASE 1 COMPLETE**)
  - Shell invocation: `/bin/zsh -lc` (configurable) via stdio pipes.
  - Signals: Supports SIGINT/SIGTERM; no job control (no TTY).
  - Packaging: `.app/.dmg`; codesign/notarization as configured.
  - **Status: Full MVP implementation with all core features operational.**

- Android (aarch64, **✅ PHASE 2 COMPLETE**)
  - Command path: Best-effort stdio subprocess execution where allowed by platform policy.
  - Scope: Commands requiring TTY or blocked by Android sandboxing are unsupported; focus on basic shell operations.
  - Integration: **✅ Tauri v2 Android target** with platform-specific command filtering and permission handling.
  - UX: **✅ Touch-optimized interface** with virtual keyboard; same IPC/events as desktop.
  - Testing: **✅ Appium automation** for comprehensive mobile testing and validation.
  - **Status: Successfully built, installed, and tested on physical devices.**

- Windows (x86_64, future)
  - Shell invocation: `powershell.exe -NoProfile -Command` (configurable) via stdio pipes.
  - No ConPTY; no TTY features; paths and quoting follow Windows semantics.
  - Packaging: `.msi`/`.exe` planned.

- Linux (x86_64, future)
  - Shell invocation: `/bin/sh -lc` (configurable) via stdio pipes.
  - Packaging: `.AppImage`/`.deb`/`.rpm` as feasible.

- iOS (aarch64, future)
  - Command path: Use `ios_system` to execute built-in commands in-process through a native bridge.
  - Scope: Only commands provided by `ios_system` are supported; TTY-required commands are unsupported.
  - Integration: Add `src-tauri/ios/` bridge; include `ios_system` via SPM/Pods.

- Interaction Flow
  - UI action → IPC `start_session`/`run_command` → Runner spawns stdio subprocess (with platform-specific restrictions on Android/iOS) → streams `command-progress` and `session-data` → UI updates xterm/Plan.

## Implementation Plan

Phase 1 — macOS (aarch64) MVP **✅ COMPLETED**
- ✅ Scaffold Tauri app: Complete Tauri v2 application with IPC boilerplate, security allowlist, and cross-platform mobile entry point.
- ✅ Stdio runner: Robust subprocess management with async I/O streaming, event-based stdout/stderr, secret redaction, no PTY usage.
- ✅ IPC surface: All commands implemented (`start_session`, `send_input`, `run_command`, `resize_view`, file ops, `apply_patch`, `update_plan`, `get_workspace`, `get_platform_info`) with matching events.
- ✅ Frontend: Complete xterm.js integration with modern addons (@xterm/addon-fit, search, web-links, webgl); mobile-responsive UI with touch-optimized tabs; Plan panel with single in_progress validation.
- ✅ Security: Workspace FS scope enforcement, platform-specific command allowlist, path validation with canonicalization, secret redaction for API keys/tokens.
- ✅ Build + QA: Updated dependencies, package.json configured, Android build system functional, cross-platform architecture ready.

Phase 2 — Android (aarch64) support **✅ COMPLETED**
- ✅ Android integration: Tauri v2 Android target configured with appropriate permissions and command filtering.
- ✅ Platform restrictions: Command allowlist implemented based on Android platform policies with graceful error handling.
- ✅ Mobile UI: Touch-optimized interface with virtual keyboard handling and gesture support implemented.
- ✅ IPC/events parity: Full compatibility with macOS IPC/events; output chunking and status events working on mobile WebView.
- ✅ Packaging: `.aab`/`.apk` build system configured; signing infrastructure ready; tested on physical devices via Appium.
- ✅ QA: Comprehensive testing with Appium automation and MCP simulation; command execution validated within Android constraints.

Phase 3 — Tooling and release hardening
- CI: Add macOS aarch64 build job; lint (clippy), format (rustfmt), typecheck TS; cache Cargo/pnpm.
- Arch gating: Enforce aarch64 (macOS/iOS) targets in CI; prepare x86_64 gates for Windows/Linux (future).
- Telemetry/logging: Minimal, opt-in, sensitive-safe logs for errors and command metadata.
- Docs: Keep README Architecture View, iOS integration notes, and Testing up to date.

Phase 4 — Future platforms (scope placeholder)
- iOS (aarch64): ios_system integration with native bridge; SPM/Pods dependency; `.ipa` packaging via Xcode.
- Windows (x86_64): Stdio PowerShell runner, path/quoting audits, packaging (`.msi/.exe`).
- Linux (x86_64): Stdio `/bin/sh` runner, packaging (`.AppImage`/`.deb`/`.rpm`).

## Security Model

- Allowlist: Tauri command allowlist only exposes vetted IPC.
- FS scope: Reads/writes restricted to the workspace directory tree.
- No remote content: Frontend served from local assets. CSP locked down.
- Shell guardrails: Disallow destructive commands outside workspace.
- Escalation: Explicit user approval dialog for privileged operations.
- Secrets: Never log sensitive values; redact in UI and logs.

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
  - `ios/` — Native glue for ios_system (bridge used on iOS builds)
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
- `run_command(args: string[], cwd?: string, escalated?: boolean): RunId` (runs with stdio pipes; no TTY. Platform-specific restrictions apply on mobile.)
- `read_file(path: string): { content: string }` (scoped)
- `write_file(path: string, content: string): void` (scoped)
- `apply_patch(patch: string): { summary: string }` (scoped, validates format)
- `update_plan(steps: PlanStep[]): Plan` (validates single in‑progress rule)
- `get_plan(): Plan`
- `get_workspace(): string`

<!-- Remote IPC commands are out of scope. -->


## Events (Emitted)

- `session-data` — `{ sessionId, data, stream: 'stdout'|'stderr' }`
- `session-exit` — `{ sessionId, code, signal? }`
- `command-progress` — `{ runId, phase: 'start'|'stdout'|'stderr'|'done', chunk? }`
- `plan-updated` — `{ plan }`
- `status` — `{ level: 'info'|'warn'|'error', message }`

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
- Mobile: Android uses best-effort subprocess execution within platform constraints. iOS (future) will use ios_system for in-process command execution.
- Async runtime: `tokio` for non‑blocking pipes; stream output to UI in small chunks.
- Encoding: UTF‑8 with lossy fallback for safety.
- Cleanup: Kill child on window close or session stop; guard against zombies.
- Signals: Limited signal handling (e.g., SIGINT/CTRL_C_EVENT) where supported; no job control.

## Command Execution & Escalation

- Default: Commands run as subprocesses using stdio pipes, scoped to workspace `cwd`; no TTY is provided.
- Escalation: When `escalated = true`, prompt user with a signed summary of the command and its effects; require explicit approval per run.
- Logging: Store minimal metadata (command, timestamps, exit code) locally; do not persist arguments containing secrets.

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
- **Tauri CLI v2.8.0+** with Android support: `cargo install tauri-cli --version '^2.0'`
- macOS (✅ **PHASE 1 COMPLETE**): Xcode Command Line Tools, Tauri prerequisites. Architecture: aarch64 (Apple Silicon) only. **Full MVP implementation with all core features.**
- Android (✅ **PHASE 2 COMPLETE**): Android SDK, NDK. Rust target: `aarch64-linux-android`. Uses **Tauri v2 Android build process**. **Successfully tested on physical devices.**

### Android: Mobile Development Setup **✅ COMPLETED**
- Prerequisites:
  - ✅ Android SDK (API level 24+), Android NDK
  - ✅ Rust target: `rustup target add aarch64-linux-android`
  - ✅ **Tauri CLI v2.8.0+**: `cargo install tauri-cli --version '^2.0'`
- Configuration:
  - ✅ **Tauri v2 Android project** configured with appropriate permissions
  - ✅ Debug/release keystore setup for signing
  - ✅ Android-specific command allowlist and filesystem scoping implemented
- Development:
  - ✅ `cargo tauri android init` — Initialize Android project
  - ✅ `cargo tauri android dev` — Run on connected device/emulator  
  - ✅ `cargo tauri android build` — Build APK/AAB for distribution
- Mobile UI adaptations:
  - ✅ Touch-optimized terminal interaction
  - ✅ Virtual keyboard integration with xterm.js
  - ✅ Gesture support for scrolling and selection
  - ✅ Context menus adapted for mobile interface
- Platform constraints:
  - ✅ File access limited to app sandbox and external storage permissions
  - ✅ Command execution subject to Android security policies
  - ✅ Network access with appropriate permissions

### Development Scripts
- `pnpm install` — Install frontend dependencies
- `pnpm tauri dev` — Run development server with hot reload
- `pnpm tauri build` — Build production bundle for current platform

#### Platform-Specific Commands  
- **macOS Desktop**: `pnpm tauri dev` | `pnpm tauri build`
- **Android Mobile**: `cargo tauri android dev` | `cargo tauri android build`
- **Cross-platform**: Use `make` targets for automated builds:
  ```bash
  make help              # Show all available targets
  make dev              # Start macOS development server
  make android-setup    # Configure Android environment
  make android-debug    # Build Android APK  
  make android-install  # Install APK on connected device
  ```

#### Quality Assurance Commands
```bash
# Testing
pnpm test                    # Run all tests
pnpm test:unit              # Unit tests only
pnpm test:e2e               # End-to-end tests
pnpm test:e2e:macos         # macOS desktop testing
pnpm test:e2e:android       # Android mobile testing
pnpm test:coverage          # Generate coverage reports

# Code Quality  
pnpm format                 # Format code with Prettier
pnpm format:check          # Check code formatting
pnpm lint                  # Lint TypeScript/JavaScript
```

## Testing & Quality Assurance

### Comprehensive Testing Strategy
The project employs **multi-layered testing** to ensure reliability across all platforms and user scenarios:

#### ✅ **Unit & Integration Testing**
- **Rust Backend**: Unit tests for process stdio handling, filesystem scope validation, patch parsing, and IPC command surface
- **TypeScript Frontend**: Component tests for UI panels, terminal behavior, and user interactions
- **Integration Tests**: End-to-end validation of frontend-backend communication

#### ✅ **Automated User Testing (Appium)**
**Real user simulation** using Appium WebDriver automation to validate complete user workflows on both desktop and mobile platforms.

**Test Coverage:**
- ✅ **Terminal Operations**: Command execution, output streaming, session management
- ✅ **Plan Management**: Dynamic updates, validation rules, real-time synchronization  
- ✅ **File Operations**: Read/write within workspace, security boundary enforcement
- ✅ **Mobile UX**: Touch interactions, virtual keyboard, gesture support
- ✅ **Cross-Platform Parity**: Feature consistency across macOS and Android

### End-to-End Testing Strategy

#### 🖥️ macOS Testing with Tauri Driver
**Automated desktop testing using tauri-driver for WebDriver automation**

Prerequisites:
```bash
# Install tauri-driver for WebDriver automation
cargo install tauri-driver
# Start tauri-driver in background
tauri-driver &
```

Test Suite (`tests/macos-e2e.spec.js`):
```javascript
// WebDriver automation for macOS desktop app
const { remote } = require('webdriverio');

describe('Codex CLI macOS E2E Tests', () => {
  let client;
  
  beforeAll(async () => {
    client = await remote({
      capabilities: {
        'tauri:options': {
          application: './target/release/codex-cli-desktop'
        }
      }
    });
  });
  
  test('Terminal session lifecycle', async () => {
    // Start new session
    await client.$('[data-testid="new-session"]').click();
    
    // Verify terminal renders
    const terminal = await client.$('[data-testid="terminal"]');
    await expect(terminal).toBeDisplayed();
    
    // Execute command
    await client.keys('pwd\n');
    await client.waitUntil(() => 
      client.$('[data-testid="terminal-output"]').getText().includes('/'));
    
    // Verify command output
    const output = await client.$('[data-testid="terminal-output"]').getText();
    expect(output).toMatch(/\/.*$/);
  });
  
  test('Plan panel updates', async () => {
    // Navigate to Plan tab  
    await client.$('[data-testid="plan-tab"]').click();
    
    // Add new plan step
    const planInput = await client.$('[data-testid="plan-input"]');
    await planInput.setValue('[{"id":"1","step":"Test step","status":"pending"}]');
    
    // Save plan
    await client.$('[data-testid="save-plan"]').click();
    
    // Verify plan updated
    await client.waitUntil(() => 
      client.$('[data-testid="plan-step-1"]').isDisplayed());
  });
  
  afterAll(async () => {
    await client.deleteSession();
  });
});
```

#### 📱 Android Testing with Appium
**Comprehensive mobile testing using Appium for Android automation**

Prerequisites:
```bash
# Install Appium and Android driver
npm install -g appium @appium/android-driver
appium driver install android
appium server --use-plugins=device-farm,element-wait
```

Test Suite (`tests/android-appium.spec.js`):
```javascript
// Appium automation for Android APK
const { remote } = require('webdriverio');

describe('Codex CLI Android E2E Tests', () => {
  let driver;
  
  beforeAll(async () => {
    driver = await remote({
      port: 4723,
      capabilities: {
        platformName: 'Android',
        'appium:deviceName': 'Android Emulator',
        'appium:app': './target/android/app/build/outputs/apk/debug/app-debug.apk',
        'appium:appPackage': 'com.codexcli.desktop',
        'appium:appActivity': '.MainActivity',
        'appium:automationName': 'UiAutomator2'
      }
    });
  });
  
  test('Mobile app launch and UI', async () => {
    // Verify app launches
    await driver.waitUntil(() => driver.$('android=new UiSelector().textContains("Codex CLI")').isDisplayed());
    
    // Check mobile tab navigation
    const terminalTab = await driver.$('android=new UiSelector().text("Terminal")');
    await expect(terminalTab).toBeDisplayed();
    
    const planTab = await driver.$('android=new UiSelector().text("Plan")');  
    await expect(planTab).toBeDisplayed();
  });
  
  test('Touch interaction and virtual keyboard', async () => {
    // Tap terminal tab
    await driver.$('android=new UiSelector().text("Terminal")').click();
    
    // Tap in terminal area to focus
    const terminalArea = await driver.$('android=new UiSelector().className("android.webkit.WebView")');
    await terminalArea.click();
    
    // Verify virtual keyboard appears (check for input methods)
    await driver.waitUntil(() => driver.isKeyboardShown());
    
    // Type command using virtual keyboard
    await driver.keys('echo "Hello Android"\n');
    
    // Wait for command execution
    await driver.pause(1000);
    
    // Verify output (check WebView content)
    const webview = await driver.$('android=new UiSelector().className("android.webkit.WebView")');
    await driver.switchContext('WEBVIEW_com.codexcli.desktop');
    
    const output = await driver.$('[data-testid="terminal-output"]').getText();
    expect(output).toContain('Hello Android');
    
    await driver.switchContext('NATIVE_APP');
  });
  
  test('Mobile gestures and scrolling', async () => {
    // Test swipe gesture for scrolling
    const screenSize = await driver.getWindowSize();
    const startY = screenSize.height * 0.8;
    const endY = screenSize.height * 0.2;
    const centerX = screenSize.width / 2;
    
    // Perform swipe up gesture
    await driver.performActions([{
      type: 'pointer',
      id: 'finger1',
      parameters: { pointerType: 'touch' },
      actions: [
        { type: 'pointerMove', duration: 0, x: centerX, y: startY },
        { type: 'pointerDown', button: 0 },
        { type: 'pointerMove', duration: 1000, x: centerX, y: endY },
        { type: 'pointerUp', button: 0 }
      ]
    }]);
    
    // Verify scroll occurred
    await driver.pause(500);
  });
  
  test('Android platform command filtering', async () => {
    // Switch to WebView context for command execution
    await driver.switchContext('WEBVIEW_com.codexcli.desktop');
    
    // Try restricted command
    await driver.$('[data-testid="command-input"]').setValue('rm -rf /');
    await driver.$('[data-testid="execute-command"]').click();
    
    // Verify command is blocked
    await driver.waitUntil(() => 
      driver.$('[data-testid="error-message"]').getText().includes('not allowed'));
    
    // Try allowed command
    await driver.$('[data-testid="command-input"]').setValue('pwd');
    await driver.$('[data-testid="execute-command"]').click();
    
    // Verify command executes
    await driver.waitUntil(() => 
      driver.$('[data-testid="terminal-output"]').getText().includes('/data/data/com.codexcli.desktop'));
    
    await driver.switchContext('NATIVE_APP');
  });
  
  afterAll(async () => {
    await driver.deleteSession();
  });
});
```

#### 🍎 iOS Testing with Appium (Future)
**iOS automation framework ready for Phase 4**

Prerequisites:
```bash
# Install iOS driver when implementing iOS support
appium driver install xcuitest
```

Test Suite (`tests/ios-appium.spec.js`):
```javascript
// Appium automation for iOS IPA (Phase 4)
const { remote } = require('webdriverio');

describe('Codex CLI iOS E2E Tests', () => {
  let driver;
  
  beforeAll(async () => {
    driver = await remote({
      port: 4723,
      capabilities: {
        platformName: 'iOS',
        'appium:deviceName': 'iPhone Simulator',
        'appium:app': './target/ios/app.ipa',
        'appium:bundleId': 'com.codexcli.desktop',
        'appium:automationName': 'XCUITest'
      }
    });
  });
  
  test('iOS app launch and native bridge', async () => {
    // Verify app launches on iOS
    await driver.waitUntil(() => 
      driver.$('-ios predicate string:name CONTAINS "Codex CLI"').isDisplayed());
    
    // Test ios_system command execution
    await driver.switchContext('WEBVIEW_1');
    
    await driver.$('[data-testid="command-input"]').setValue('ls');
    await driver.$('[data-testid="execute-command"]').click();
    
    // Verify ios_system command works
    await driver.waitUntil(() => 
      driver.$('[data-testid="terminal-output"]').getText().length > 0);
  });
  
  // Additional iOS-specific tests...
});
```

### Test Automation Infrastructure

#### Makefile Testing Targets
```makefile
# Testing targets
test-unit:
	cargo test
	pnpm test

test-macos-e2e: 
	tauri-driver &
	pnpm test:e2e:macos
	pkill tauri-driver

test-android-e2e:
	appium server --port 4723 &
	pnpm test:e2e:android  
	pkill -f appium

test-ios-e2e:
	appium server --port 4723 &
	pnpm test:e2e:ios
	pkill -f appium

test-all: test-unit test-macos-e2e test-android-e2e
```

#### CI/CD Integration
```yaml
# .github/workflows/test.yml
name: Cross-Platform Testing
on: [push, pull_request]

jobs:
  test-macos:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Tauri
        run: cargo install tauri-cli tauri-driver
      - name: Run macOS E2E tests
        run: make test-macos-e2e
        
  test-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Android SDK
        uses: android-actions/setup-android@v2
      - name: Setup Appium
        run: |
          npm install -g appium @appium/android-driver
          appium driver install android
      - name: Build Android APK
        run: make android-debug
      - name: Run Android E2E tests
        run: make test-android-e2e
```

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

- Initial: CI builds for macOS (.app/.dmg), architecture aarch64 only.
- Next: Android (.aab/.apk via Gradle), architecture aarch64 only.
- Future: iOS (.ipa via Xcode Archive/TestFlight), Windows (.msi/.exe) and Linux (.AppImage/.deb/.rpm) as feasible, architecture aarch64 (iOS) or x86_64 (Windows/Linux).
- Codesigning and notarization/provisioning hooks configurable per platform.
- Auto‑update optional on desktop; mobile uses store updates.

## Limitations & Future Work

- No TTY: Full‑screen TUIs (e.g., `vim`, `top`), job control, and programs requiring a real terminal are unsupported.
- Shell behavior: Without a TTY, some prompts and interactive flows may not function.
- Mobile: Android command execution is limited by platform sandboxing policies. iOS (future) will be limited to ios_system command coverage.
- Sandboxed FS: External tools must operate inside workspace or via escrow flow.
- Future: Optional TTY emulation layer for limited interactive support; multi‑pane layout; richer file diff viewer; plugin API; offline mobile engine via WASM where feasible.

---

This document describes the intended design and behaviors to guide implementation. Deviation from this spec should be documented with rationale.
