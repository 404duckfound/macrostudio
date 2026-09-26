# Macro Studio — agent notes

Tauri v2 + React 19 + Zustand + Vite 8 desktop app (Windows-first). Design tokens live in `src/theme.css`, mirrored by `DESIGN.md` (frontmatter hex + body must stay in sync when colors change).

## Commands (run in `macro-studio/`)

- Package manager is **pnpm** (`pnpm-lock.yaml`; no npm/yarn lock).
- Frontend verify: `pnpm build` (= `tsc && vite build`). This is also the only "test" — **no tests, no linter, no CI workflows exist**.
- Rust verify: `cargo check --manifest-path src-tauri/Cargo.toml` — keep it warning-free.
- Dev: `pnpm tauri dev` — Vite port `1420` is fixed (`strictPort: true`); `src-tauri/` is excluded from Vite watch (Rust changes recompile but don't reload the webview; config/capability changes need a full `tauri dev` restart).

## Backend layout (`src-tauri/src/`)

- `main.rs` is entry-point only; all wiring lives in `lib.rs` (`run()`).
- Modules: `commands/` (IPC `#[tauri::command]`), `services/` (`ahk_manager`, `generator`, `watcher`), `state/` (`AppState`), `events/` (event-name constants).
- **New command = add fn in `commands/` + register it in `generate_handler!` in `lib.rs`** (forgetting this gives a runtime "command not found", not a compile error). If it touches fs/dialog/store/shortcut, also add the plugin permission in `src-tauri/capabilities/default.json`.
- IPC: request-response via `invoke` (see `src/hooks/useTauriIpc.ts` + components); backend→frontend events via `listen("active-window-changed")` (const in `events/mod.rs`, string literal in `watcher.rs`).

## Gotchas (verified against current code)

- `tauri` dep needs `features = ["tray-icon"]` — without it `tauri::tray` fails to resolve.
- `state/mod.rs` re-exports `AppState`; commands import `crate::state::AppState`, not `crate::state::app_state::AppState`.
- `windows` crate is `0.58`: module is `Win32::System::Diagnostics::ToolHelp` (capital H — feature `Win32_System_Diagnostics_ToolHelp`); `MSG` is in `UI::WindowsAndMessaging`; null HWND is `HWND(std::ptr::null_mut())`; `app.emit` needs `use tauri::Emitter` in scope.
- `services/watcher.rs` shares the `AppHandle` via `static mut APP` + `std::ptr::addr_of!` — don't "simplify" to `APP.clone()` (hits `static_mut_refs` warning and breaks warning-free check).
- Saving a profile rewrites its `.ahk` but does NOT restart an already-running AHK process — re-run via overlay (Ctrl+Alt+M) after trigger/action edits.
- `tools/AutoHotkey64.exe` **is in the repo** and bundled (`bundle.resources: ["../tools/*"]`); `ahk_manager.rs` spawns it with the **relative path** `tools/AutoHotkey64.exe` (works because cwd is the project root in dev).
- Profiles/scripts are stored under raw `%APPDATA%/macro-studio/profiles` (JSON + `.ahk`) via `commands/profile.rs` — plain `std::env::var("APPDATA")`, not the Tauri path API. Windows-only assumption. `profile_save` always writes both `{id}.json` and the compiled `{id}.ahk`; `profile_list` backfills a missing `.ahk` for older profiles.
- `tauri.conf.json` declares an `overlay` window at `/overlay.html`, but **that HTML file does not exist**; `OverlayPanel.tsx` is currently unwired (not imported by `App.tsx`). The Monaco-based `AhkEditor.tsx` was removed (dead code) along with the `@monaco-editor/react` dep.
- `capabilities/default.json` grants permissions to windows `["main", "overlay"]`; a new window label needs adding there.
- `tsconfig` is strict with `noUnusedLocals`/`noUnusedParameters` — unused imports fail `pnpm build`.

## Frontend conventions

- Shell: `App.tsx` = full-width `TitleBar` on top (frameless, 38px, logo + white title text left, min/max/close right, 1px bottom border, needs `core:window:allow-*` permissions) + row below with `Navbar` on the left (66px Profiles-only icon rail) and `ProfileRail` (264px, `bg-base`, single 1px right divider) + `Workspace` (Stitch: flow canvas with Configured Triggers + 340px Trigger Inspector). Builder panel removed — trigger editing lives in `Workspace/Workspace.tsx` (Record Key/blur + Kaydet saves).
- Profile semantics: `target_exe: null` = applies to **all** windows; add/edit modal has **no trigger field** (new profiles default to `F9`) and owns the target-exe picker (running processes via `system_running_exes`/Toolhelp32 or active-window capture); trigger + actions are edited in `Workspace` inspector (Record Key + Kaydet saves).
- `defaultId` (default-profile selection) is **frontend-only Zustand state, deliberately not persisted** — `useTauriIpc.ts` self-heals a `Default` all-windows profile (`target_exe: null`) at startup and whenever the last all-windows profile is deleted; explicit "Make default" on a targeted profile is never overridden.
- Global `contextmenu` is suppressed in `main.tsx` (right-click menus intentionally disabled).
