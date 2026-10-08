use serde::{Deserialize, Deserializer, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Action {
    Mouse {
        #[serde(default = "default_mouse_button")]
        button: String,
        #[serde(default)] x: i32,
        #[serde(default)] y: i32,
    },
    #[serde(rename = "macro")]
    MacroRef { macro_id: String },
    Script { #[serde(default)] code: String },
    Key {
        key: String,
        #[serde(default = "default_behavior")]
        behavior: KeyBehavior,
        #[serde(default)]
        pre_delay_ms: u32,
        #[serde(default = "default_repeat")]
        repeat: u32,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum Block {
    Mouse {
        #[serde(default = "default_mouse_button")]
        button: String,
        #[serde(default)] x: i32,
        #[serde(default)] y: i32,
    },
    Delay { #[serde(default)] ms: u32 },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Macro {
    pub id: String,
    pub name: String,
    #[serde(default, deserialize_with = "blocks_lenient")]
    pub blocks: Vec<Block>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum KeyBehavior {
    Tap,
    Hold,
    Toggle,
}

fn default_behavior() -> KeyBehavior {
    KeyBehavior::Tap
}

fn default_repeat() -> u32 {
    1
}

fn default_mouse_button() -> String {
    "Left".to_string()
}

fn actions_lenient<'de, D>(deserializer: D) -> Result<Vec<Action>, D::Error>
where
    D: Deserializer<'de>,
{
    let raw = Vec::<serde_json::Value>::deserialize(deserializer)?;
    Ok(raw
        .into_iter()
        .filter_map(|v| serde_json::from_value(v).ok())
        .collect())
}

// Entries that no longer deserialize (e.g. the removed {"kind":"keys"}
// blocks) are dropped so the macro itself stays loadable. Same rule as
// actions_lenient: dropping is the accepted upgrade consequence.
fn blocks_lenient<'de, D>(deserializer: D) -> Result<Vec<Block>, D::Error>
where
    D: Deserializer<'de>,
{
    let raw = Vec::<serde_json::Value>::deserialize(deserializer)?;
    Ok(raw
        .into_iter()
        .filter_map(|v| serde_json::from_value(v).ok())
        .collect())
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ModSide {
    Left,
    Right,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Trigger {
    pub shortcut: String,
    // Entries that no longer deserialize (e.g. the removed {"type":"custom"}
    // actions) are dropped so the profile itself stays loadable. Dropping is
    // the accepted upgrade consequence, matching the earlier block_key move.
    #[serde(default, deserialize_with = "actions_lenient")]
    pub actions: Vec<Action>,
    // Whether this trigger swallows the physical keypress. Missing in JSON
    // written before this moved down from the profile, so it defaults to
    // passthrough -- existing profiles lose blocking on upgrade, by design.
    #[serde(default)]
    pub block_key: bool,
    // Fire when the key is released instead of pressed (" Up" suffix).
    // Missing in older JSON, so old triggers keep firing on press.
    #[serde(default)]
    pub fire_on_release: bool,
    // Either side fires by default; an entry pins one modifier
    // ("Ctrl"/"Shift"/"Alt"/"Win") to its left or right key ("<" / ">").
    #[serde(default)]
    pub mod_sides: std::collections::HashMap<String, ModSide>,
    // Fire even when extra modifiers are held ("*" prefix).
    #[serde(default)]
    pub wildcard: bool,
    // Force the keyboard hook ("$" prefix), so Send cannot fire this
    // hotkey itself.
    #[serde(default)]
    pub force_hook: bool,
}

/// Quotes `value` as an AHK double-quoted literal: quotes and backticks are
/// escaped and line endings collapse to a space. The profile name is user input,
/// so this matters -- an unescaped newline would end the code line and start a
/// new one.
fn ahk_string_literal(value: &str) -> String {
    let escaped: String = value
        .replace(['\r', '\n'], " ")
        .replace('`', "``")
        .replace('"', "`\"");
    format!("\"{escaped}\"")
}

pub fn compile_to_ahk_v2(
    triggers: &[Trigger],
    script_title: &str,
    macros: &[Macro],
) -> String {
    // #NoTrayIcon: keep AHK's own green tray icon from appearing at all. The
    // Macro Studio window is the only indicator; the tray should not show two.
    //
    // A_ScriptName: MsgBox/InputBox/FileSelect/DirSelect/Gui default their title
    // to the script filename, which is a profile UUID -- a MsgBox came up titled
    // "3e17c59b-c1fd-...".
    let mut script = format!(
        "#Requires AutoHotkey v2.0\n#NoTrayIcon\nA_ScriptName := {}\n\n",
        ahk_string_literal(script_title)
    );
    // Suppressing needs no prefix: simply omitting `~` is enough. `*` is the hook
    // modifier -- it changes *when* a hotkey fires (it also catches the key-up
    // and fires while extra modifiers are held), so treating it as a swallow
    // prefix would mean two things at once.
    //
    // The prefix is per trigger. Deduplication therefore keys on the shortcut
    // alone: keying on shortcut+prefix would let one trigger blocked and another
    // passthrough both survive, emitting `,::` and `~,::` for the same key.
    let mut seen = std::collections::HashSet::new();
    let blocks: Vec<&Trigger> = triggers
        .iter()
        .filter(|t| !t.shortcut.trim().is_empty())
        .filter(|t| {
            // Wildcard and release variants are distinct hotkeys; the hook
            // prefix is not (it changes hook usage, not identity), so a
            // hook-only difference collapses to the first trigger -- the
            // same rule as an opposing block_key.
            seen.insert(format!(
                "{}{}{}",
                if t.wildcard { "*" } else { "" },
                map_trigger_hotkey(t.shortcut.trim(), &t.mod_sides),
                if t.fire_on_release { " up" } else { "" }
            ))
        })
        .collect();
    for trigger in &blocks {
        let hook = if trigger.force_hook { "$" } else { "" };
        let tilde = if trigger.block_key { "" } else { "~" };
        let star = if trigger.wildcard { "*" } else { "" };
        let up = if trigger.fire_on_release { " Up" } else { "" };
        let key = format!(
            "{hook}{tilde}{star}{}{up}",
            map_trigger_hotkey(trigger.shortcut.trim(), &trigger.mod_sides)
        );
        script.push_str(&format!("{key}::\n{{\n"));
        for (action_idx, action) in trigger.actions.iter().enumerate() {
            match action {
                Action::Mouse { button, x, y } => {
                    script.push_str(&mouse_click_line(button, *x, *y));
                }
                Action::MacroRef { macro_id } => {
                    // Unknown ids (deleted out of band, hand-edited JSON) emit
                    // nothing: a dangling reference must never break a script.
                    if let Some(found) = macros.iter().find(|m| &m.id == macro_id) {
                        for block in &found.blocks {
                            emit_block(&mut script, block);
                        }
                    }
                }
                Action::Script { code } => {
                    for line in code.lines() {
                        script.push_str(&format!("    {line}\n"));
                    }
                }
                Action::Key {
                    key,
                    behavior,
                    pre_delay_ms,
                    repeat,
                } => {
                    script.push_str(&key_action_lines(
                        key,
                        *behavior,
                        *pre_delay_ms,
                        *repeat,
                        trigger.shortcut.trim(),
                        action_idx,
                    ));
                }
            }
        }
        script.push_str("}\n");
    }
    script
}

fn emit_block(script: &mut String, block: &Block) {
    match block {
        Block::Mouse { button, x, y } => {
            script.push_str(&mouse_click_line(button, *x, *y));
        }
        Block::Delay { ms } => {
            script.push_str(&format!("    Sleep({ms})\n"));
        }
    }
}

fn brace_key_name(part: &str) -> String {
    match part {
        "Ctrl" => "Ctrl".to_string(),
        "Shift" => "Shift".to_string(),
        "Alt" => "Alt".to_string(),
        "Win" | "Meta" => "LWin".to_string(),
        "MouseLeft" => "LButton".to_string(),
        "MouseRight" => "RButton".to_string(),
        "MouseMiddle" => "MButton".to_string(),
        "MouseX1" => "XButton1".to_string(),
        "MouseX2" => "XButton2".to_string(),
        other => other.to_string(),
    }
}

/// Key name for `Send "{name down}"`. These are the names the Send key table
/// accepts; `{ArrowUp}` is not one of them, so callers must hand us a mapped name
/// (see KEY_EVENT_ALIASES in keys.ts) rather than a raw `KeyboardEvent.key`.
fn native_key_name(part: &str) -> String {
    match part {
        "Ctrl" => "LCtrl".to_string(),
        "Shift" => "LShift".to_string(),
        "Alt" => "LAlt".to_string(),
        "Win" | "Meta" => "LWin".to_string(),
        "MouseLeft" => "LButton".to_string(),
        "MouseRight" => "RButton".to_string(),
        "MouseMiddle" => "MButton".to_string(),
        "MouseX1" => "XButton1".to_string(),
        "MouseX2" => "XButton2".to_string(),
        "Escape" => "Esc".to_string(),
        other => other.to_string(),
    }
}

fn key_parts(key: &str) -> Vec<&str> {
    key.split('+')
        .map(str::trim)
        .filter(|p| !p.is_empty())
        .collect()
}

fn wrap_in_repeat(body: &str, repeat: u32) -> String {
    if repeat <= 1 {
        return body.to_string();
    }
    let indented: String = body
        .lines()
        .map(|l| {
            if l.is_empty() {
                "\n".to_string()
            } else {
                format!("    {l}\n")
            }
        })
        .collect();
    format!("    Loop {repeat}\n    {{\n{indented}    }}\n")
}

/// The physical key a Hold waits on: KeyWait needs the main key, not the
/// modifiers, so "Ctrl+F9" waits on F9 and "Ctrl+MouseLeft" on LButton.
fn trigger_wait_key(shortcut: &str) -> String {
    let main = key_parts(shortcut).last().copied().unwrap_or_default();
    native_key_name(main)
}

fn key_action_lines(
    key: &str,
    behavior: KeyBehavior,
    pre_delay_ms: u32,
    repeat: u32,
    trigger_shortcut: &str,
    action_idx: usize,
) -> String {
    let parts = key_parts(key);
    if parts.is_empty() {
        return String::new();
    }

    let body = match behavior {
        KeyBehavior::Tap => {
            let braces = parts
                .iter()
                .map(|p| format!("{{{}}}", brace_key_name(p)))
                .collect::<Vec<_>>()
                .join("");
            wrap_in_repeat(&format!("    Send(\"{braces}\")\n"), repeat)
        }
        KeyBehavior::Hold => {
            // Down on fire, up when the trigger itself is physically
            // released. Repeat is ignored: holding forever and repeating
            // N times cannot both be true.
            let downs: String = parts
                .iter()
                .map(|p| format!("    Send(\"{{{} down}}\")\n", native_key_name(p)))
                .collect();
            let ups: String = parts
                .iter()
                .rev()
                .map(|p| format!("    Send(\"{{{} up}}\")\n", native_key_name(p)))
                .collect();
            format!("{downs}    KeyWait(\"{}\")\n{ups}", trigger_wait_key(trigger_shortcut))
        }
        KeyBehavior::Toggle => {
            // Odd presses hold the target down, even presses release it.
            // The flag is static so it survives across firings; the index
            // keeps two toggle actions in one trigger from sharing it.
            let downs: String = parts
                .iter()
                .map(|p| format!("        Send(\"{{{} down}}\")\n", native_key_name(p)))
                .collect();
            let ups: String = parts
                .iter()
                .rev()
                .map(|p| format!("        Send(\"{{{} up}}\")\n", native_key_name(p)))
                .collect();
            format!(
                "    static _tgl{action_idx} := false\n    _tgl{action_idx} := !_tgl{action_idx}\n    if (_tgl{action_idx})\n    {{\n{downs}    }}\n    else\n    {{\n{ups}    }}\n"
            )
        }
    };

    if pre_delay_ms == 0 {
        body
    } else {
        format!("    Sleep({pre_delay_ms})\n{body}")
    }
}

fn mouse_click_line(button: &str, x: i32, y: i32) -> String {
    if x == 0 && y == 0 {
        format!("    Click(\"{button}\")\n")
    } else {
        format!("    Click({x}, {y}, \"{button}\")\n")
    }
}

/// Maps a recorded shortcut to its AHK hotkey form, pinning any sided
/// modifiers to their left ("<") or right (">") key. "Meta" shares Win's
/// entry; anything else maps exactly like the plain form.
fn map_trigger_hotkey(
    input: &str,
    sides: &std::collections::HashMap<String, ModSide>,
) -> String {
    key_parts(input)
        .iter()
        .map(|part| {
            let side_key = if *part == "Meta" { "Win" } else { part };
            let angle = match sides.get(side_key) {
                Some(ModSide::Left) => "<",
                Some(ModSide::Right) => ">",
                None => "",
            };
            match part.trim() {
                "Ctrl" => format!("{angle}^"),
                "Alt" => format!("{angle}!"),
                "Shift" => format!("{angle}+"),
                "Win" => format!("{angle}#"),
                "MouseLeft" => "LButton".to_string(),
                "MouseRight" => "RButton".to_string(),
                "MouseMiddle" => "MButton".to_string(),
                "MouseX1" => "XButton1".to_string(),
                "MouseX2" => "XButton2".to_string(),
                other => other.to_string(),
            }
        })
        .collect::<Vec<_>>()
        .join("")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn trig(shortcut: &str, actions: Vec<Action>) -> Trigger {
        Trigger {
            shortcut: shortcut.to_string(),
            actions,
            block_key: true,
            fire_on_release: false,
            mod_sides: std::collections::HashMap::new(),
            wildcard: false,
            force_hook: false,
        }
    }

    fn passthrough(shortcut: &str, actions: Vec<Action>) -> Trigger {
        Trigger {
            shortcut: shortcut.to_string(),
            actions,
            block_key: false,
            fire_on_release: false,
            mod_sides: std::collections::HashMap::new(),
            wildcard: false,
            force_hook: false,
        }
    }

    const TEST_TITLE: &str = "Test Profile";

    fn macroref(macro_id: &str) -> Action {
        Action::MacroRef { macro_id: macro_id.to_string() }
    }

    fn named_macro(id: &str, blocks: Vec<Block>) -> Macro {
        Macro { id: id.to_string(), name: id.to_string(), blocks }
    }

    #[test]
    fn each_trigger_gets_own_body() {
        let macros = vec![named_macro("m1", vec![Block::Delay { ms: 10 }])];
        let out = compile_to_ahk_v2(&[
                trig(
                    "Ctrl+Shift+F1",
                    vec![Action::Script { code: "Sleep(5)".to_string() }],
                ),
                trig("F9", vec![macroref("m1")]),
            ],
            TEST_TITLE,
            &macros);
        assert!(out.contains("^+F1::\n{\n    Sleep(5)\n}\n"));
        assert!(out.contains("F9::\n{\n    Sleep(10)\n}\n"));
    }

    #[test]
    fn mouse_action_clicks_pointer_or_coords() {
        let out = compile_to_ahk_v2(&[trig(
                "F9",
                vec![
                    Action::Mouse {
                        button: "Right".to_string(),
                        x: 0,
                        y: 0,
                    },
                    Action::Mouse {
                        button: "Left".to_string(),
                        x: 5,
                        y: 6,
                    },
                ],
            )], TEST_TITLE, &[]);
        assert!(out.contains("    Click(\"Right\")\n    Click(5, 6, \"Left\")\n"));
    }

    #[test]
    fn macro_blocks_mix_delay_and_mouse() {
        let macros = vec![named_macro("m1", vec![
            Block::Delay { ms: 15 },
            Block::Delay { ms: 50 },
            Block::Mouse {
                button: "Left".to_string(),
                x: 10,
                y: 20,
            },
        ])];
        let out = compile_to_ahk_v2(&[trig(
                "F9",
                vec![macroref("m1")],
            )], TEST_TITLE, &macros);
        assert!(out.contains("    Sleep(15)\n    Sleep(50)\n    Click(10, 20, \"Left\")\n"));
    }

    #[test]
    fn zero_coords_click_current_pointer() {
        let macros = vec![named_macro("m1", vec![Block::Mouse {
            button: "Right".to_string(),
            x: 0,
            y: 0,
        }])];
        let out = compile_to_ahk_v2(&[trig(
                "F9",
                vec![macroref("m1")],
            )], TEST_TITLE, &macros);
        assert!(out.contains("    Click(\"Right\")\n"));
        assert!(!out.contains("Click(0, 0,"));
    }

    #[test]
    fn suppress_on_emits_bare_hotkey() {
        let out = compile_to_ahk_v2(&[trig("F9", vec![])], TEST_TITLE, &[]);
        assert!(out.contains("\nF9::"));
        assert!(!out.contains("*F9::"));
        assert!(!out.contains("~F9::"));
    }

    #[test]
    fn suppress_off_prefixes_tilde() {
        let out = compile_to_ahk_v2(&[passthrough("F9", vec![])], TEST_TITLE, &[]);
        assert!(out.contains("~F9::"));
        assert!(!out.contains("*F9::"));
    }

    #[test]
    fn each_trigger_keeps_its_own_prefix() {
        let out =
            compile_to_ahk_v2(&[trig("F9", vec![]), passthrough("F10", vec![])], TEST_TITLE, &[]);
        assert!(out.contains("\nF9::"));
        assert!(out.contains("\n~F10::"));
    }

    // Deduplication keys on the shortcut alone. Keying on shortcut+prefix would
    // let the same key be defined twice with opposing behaviour -- `,::` and
    // `~,::` -- and AHK would then have no clear winner.
    #[test]
    fn duplicate_shortcut_emits_one_hotkey_even_with_opposing_prefixes() {
        let out =
            compile_to_ahk_v2(&[trig("F9", vec![]), passthrough("F9", vec![])], TEST_TITLE, &[]);
        assert!(out.contains("\nF9::"));
        assert!(!out.contains("~F9::"));
        assert_eq!(out.matches("F9::").count(), 1);
    }

    #[test]
    fn empty_triggers_emit_no_hotkey() {
        let out = compile_to_ahk_v2(&[], TEST_TITLE, &[]);
        assert!(!out.contains("::"));
        assert!(out.starts_with("#Requires AutoHotkey v2.0"));
    }

    #[test]
    fn script_sets_dialog_title_to_profile_name() {
        let out = compile_to_ahk_v2(&[trig("F9", vec![])], "Render Farm", &[]);
        assert!(out.contains("\nA_ScriptName := \"Render Farm\"\n"));
    }

    #[test]
    fn script_title_is_escaped_for_ahk_literal() {
        // Tirnak ve backtick kacirilir; satir sonu kod uretmemeli.
        assert_eq!(ahk_string_literal("a\"b"), "\"a`\"b\"");
        assert_eq!(ahk_string_literal("a`b"), "\"a``b\"");
        assert_eq!(ahk_string_literal("a\r\nb"), "\"a  b\"");
        let out = compile_to_ahk_v2(&[], "Say \"hi\"\r\nExitApp", &[]);
        assert!(out.contains("A_ScriptName := \"Say `\"hi`\"  ExitApp\"\n"));
        assert!(!out.contains("ExitApp\n"));
    }

    #[test]
    fn script_suppresses_autohotkey_tray_icon() {
        let out = compile_to_ahk_v2(&[trig("F9", vec![])], TEST_TITLE, &[]);
        // Directives carry a leading `#`; without it AHK does not recognise
        // `NoTrayIcon` and the tray icon shows up anyway.
        assert!(out.contains("\n#NoTrayIcon\n"));
        assert!(!out.contains("\nNoTrayIcon\n"));
    }

    #[test]
    fn shortcutless_triggers_emit_nothing() {
        let macros = vec![named_macro("m1", vec![Block::Delay { ms: 5 }])];
        let out = compile_to_ahk_v2(&[trig("", vec![macroref("m1")]), trig("F9", vec![])], TEST_TITLE, &macros);
        assert_eq!(out.matches("::").count(), 1);
        assert!(!out.contains("Sleep(5)"));
    }

    #[test]
    fn script_action_emitted_verbatim() {
        let out = compile_to_ahk_v2(&[trig(
                "F9",
                vec![Action::Script {
                    code: "MsgBox(\"a\")\nSleep(10)".to_string(),
                }],
            )], TEST_TITLE, &[]);
        assert!(out.contains("    MsgBox(\"a\")\n    Sleep(10)\n"));
    }

    #[test]
    fn blank_trigger_strings_are_skipped() {
        let out = compile_to_ahk_v2(&[trig("", vec![]), trig("   ", vec![])], TEST_TITLE, &[]);
        assert!(!out.contains("::"));
    }

    #[test]
    fn duplicate_triggers_emit_single_hotkey() {
        let out = compile_to_ahk_v2(&[trig("F9", vec![]), trig("F9", vec![])], TEST_TITLE, &[]);
        assert_eq!(out.matches("F9::").count(), 1);
    }

    #[test]
    fn mouse_buttons_map_to_ahk_names() {
        let out = compile_to_ahk_v2(&[
                trig("MouseLeft", vec![]),
                trig("MouseRight", vec![]),
                trig("MouseMiddle", vec![]),
                trig("MouseX1", vec![]),
                trig("Ctrl+MouseLeft", vec![]),
            ],
            TEST_TITLE, &[]);
        assert!(out.contains("LButton::"));
        assert!(out.contains("RButton::"));
        assert!(out.contains("MButton::"));
        assert!(out.contains("XButton1::"));
        assert!(out.contains("^LButton::"));
    }

    fn key_action(key: &str, behavior: KeyBehavior, pre_delay_ms: u32, repeat: u32) -> Action {
        Action::Key {
            key: key.to_string(),
            behavior,
            pre_delay_ms,
            repeat,
        }
    }

    #[test]
    fn key_tap_emits_send() {
        let out = compile_to_ahk_v2(&[trig("F9", vec![key_action("Enter", KeyBehavior::Tap, 0, 1)])], TEST_TITLE, &[]);
        assert!(out.contains("F9::\n{\n    Send(\"{Enter}\")\n}\n"));
        assert!(!out.contains("KeyDown"));
        assert!(!out.contains("Loop"));
    }

    // Hold keeps the target down while the trigger itself is physically held:
    // down, wait for the trigger's release, then up -- in that order.
    #[test]
    fn key_hold_keeps_target_down_while_trigger_held() {
        let out = compile_to_ahk_v2(&[trig("F9", vec![key_action("a", KeyBehavior::Hold, 0, 1)])], TEST_TITLE, &[]);
        let down = out.find("Send(\"{a down}\")").unwrap();
        let wait = out.find("KeyWait(\"F9\")").unwrap();
        let up = out.find("Send(\"{a up}\")").unwrap();
        assert!(down < wait && wait < up);
    }

    // A combo trigger waits on its main key, not the modifiers.
    #[test]
    fn key_hold_uses_main_key_of_combo_trigger() {
        let out = compile_to_ahk_v2(&[trig("Ctrl+F9", vec![key_action("a", KeyBehavior::Hold, 0, 1)])], TEST_TITLE, &[]);
        assert!(out.contains("    KeyWait(\"F9\")\n"));
    }

    // Toggle flips a per-hotkey flag: odd presses hold the target down,
    // even presses release it.
    #[test]
    fn key_toggle_flips_with_static_flag() {
        let out = compile_to_ahk_v2(&[trig("F9", vec![key_action("a", KeyBehavior::Toggle, 0, 1)])], TEST_TITLE, &[]);
        assert!(out.contains("static "));
        assert!(out.contains("Send(\"{a down}\")\n"));
        assert!(out.contains("Send(\"{a up}\")\n"));
    }

    // Repeating forever while held/toggled makes no sense, so repeat is
    // ignored there and only Tap loops.
    #[test]
    fn key_hold_and_toggle_ignore_repeat() {
        let held = compile_to_ahk_v2(&[trig("F9", vec![key_action("A", KeyBehavior::Hold, 0, 9)])], TEST_TITLE, &[]);
        assert!(!held.contains("Loop"));

        let toggled = compile_to_ahk_v2(&[trig("F9", vec![key_action("A", KeyBehavior::Toggle, 0, 9)])], TEST_TITLE, &[]);
        assert!(!toggled.contains("Loop"));
    }

    #[test]
    fn key_combo_expands_to_braces() {
        let out = compile_to_ahk_v2(&[trig("F9", vec![key_action("Ctrl+Shift+Enter", KeyBehavior::Tap, 0, 1)])], TEST_TITLE, &[]);
        assert!(out.contains("    Send(\"{Ctrl}{Shift}{Enter}\")\n"));
    }

    #[test]
    fn key_letter_case_survives_compilation() {
        // AHK'de `{a}` shift'siz, `{A}` shift'li gonderir; buyuk harfe cevirmek
        // tap hedefinin anlamini bozardi.
        let lower = compile_to_ahk_v2(&[trig("F9", vec![key_action("a", KeyBehavior::Tap, 0, 1)])], TEST_TITLE, &[]);
        assert!(lower.contains("    Send(\"{a}\")\n"));
        assert!(!lower.contains("    Send(\"{A}\")\n"));

        let upper = compile_to_ahk_v2(&[trig("F9", vec![key_action("A", KeyBehavior::Tap, 0, 1)])], TEST_TITLE, &[]);
        assert!(upper.contains("    Send(\"{A}\")\n"));

        // Hold/Toggle fiziksel tus adidir; AHK'ta case duyarsiz.
        let held = compile_to_ahk_v2(&[trig("F9", vec![key_action("a", KeyBehavior::Hold, 0, 1)])], TEST_TITLE, &[]);
        assert!(held.contains("    Send(\"{a down}\")\n"));
    }

    #[test]
    fn key_pre_delay_and_repeat_wrap_in_loop() {
        let out = compile_to_ahk_v2(&[trig("F9", vec![key_action("Enter", KeyBehavior::Tap, 200, 4)])], TEST_TITLE, &[]);
        assert!(out.contains("    Sleep(200)\n    Loop 4\n    {\n        Send(\"{Enter}\")\n    }\n"));
        assert_eq!(out.matches("Sleep(200)").count(), 1);
    }

    #[test]
    fn key_repeat_is_normalized_and_ignored_for_hold() {
        let zero = compile_to_ahk_v2(&[trig("F9", vec![key_action("Enter", KeyBehavior::Tap, 0, 0)])], TEST_TITLE, &[]);
        assert!(zero.contains("    Send(\"{Enter}\")\n"));
        assert!(!zero.contains("Loop"));

        let held = compile_to_ahk_v2(&[trig("F9", vec![key_action("A", KeyBehavior::Hold, 0, 9)])], TEST_TITLE, &[]);
        assert!(held.contains("    Send(\"{A down}\")\n"));
        assert!(!held.contains("Loop"));
    }

    #[test]
    fn key_action_with_empty_target_emits_nothing() {
        let out = compile_to_ahk_v2(&[trig("F9", vec![key_action("", KeyBehavior::Tap, 0, 1)])], TEST_TITLE, &[]);
        assert!(out.contains("F9::\n{\n}\n"));
        assert!(!out.contains("Send("));
    }

    #[test]
    fn key_action_deserializes_with_defaults() {
        let parsed: Action = serde_json::from_str(r#"{"type":"key","key":"Enter"}"#).unwrap();
        match parsed {
            Action::Key {
                behavior,
                pre_delay_ms,
                repeat,
                ..
            } => {
                assert_eq!(behavior, KeyBehavior::Tap);
                assert_eq!(pre_delay_ms, 0);
                assert_eq!(repeat, 1);
            }
            other => panic!("beklenen Key, gelen {other:?}"),
        }
    }

    // HoldDown/Release are removed: old manual down/up actions drop on parse
    // so the profile itself stays loadable. Single-trigger Hold/Toggle are
    // their replacement.
    #[test]
    fn legacy_holddown_release_actions_are_dropped_on_parse() {
        let old = serde_json::json!({
            "shortcut": "F9", "block_key": false,
            "actions": [
                {"type": "key", "key": "a", "behavior": "hold_down"},
                {"type": "mouse", "button": "Left", "x": 0, "y": 0}
            ]
        });
        let t: Trigger = serde_json::from_value(old).unwrap();
        assert_eq!(t.actions.len(), 1);

        let old = serde_json::json!({
            "shortcut": "F9", "block_key": false,
            "actions": [
                {"type": "key", "key": "a", "behavior": "release"}
            ]
        });
        let t: Trigger = serde_json::from_value(old).unwrap();
        assert!(t.actions.is_empty());
    }

    // Old profiles carry {"type":"custom"} actions. Customs are dropped on
    // parse so the profile itself stays loadable.
    #[test]
    fn legacy_custom_action_is_dropped_on_parse() {
        let old = serde_json::json!({
            "shortcut": "F9", "block_key": false,
            "actions": [
                {"type": "custom", "blocks": [{"kind": "delay", "ms": 5}]},
                {"type": "mouse", "button": "Left", "x": 0, "y": 0}
            ]
        });
        let t: Trigger = serde_json::from_value(old).unwrap();
        assert_eq!(t.actions.len(), 1);
    }

    // A trigger with only custom actions parses to empty actions instead of
    // failing the whole profile load.
    #[test]
    fn custom_only_trigger_parses_to_empty_actions() {
        let old = serde_json::json!({
            "shortcut": "F9", "block_key": false,
            "actions": [
                {"type": "custom", "blocks": [{"kind": "delay", "ms": 5}]}
            ]
        });
        let t: Trigger = serde_json::from_value(old).unwrap();
        assert!(t.actions.is_empty());
    }

    #[test]
    fn macro_ref_expands_blocks_inline() {
        let macros = vec![Macro {
            id: "m1".to_string(),
            name: "Greet".to_string(),
            blocks: vec![
                Block::Mouse {
                    button: "Left".to_string(),
                    x: 0,
                    y: 0,
                },
                Block::Delay { ms: 50 },
            ],
        }];
        let out = compile_to_ahk_v2(
            &[trig(
                "F9",
                vec![Action::MacroRef { macro_id: "m1".to_string() }],
            )],
            TEST_TITLE,
            &macros,
        );
        assert!(out.contains("    Click(\"Left\")\n    Sleep(50)\n"));
    }

    #[test]
    fn missing_macro_ref_emits_nothing() {
        let out = compile_to_ahk_v2(
            &[trig(
                "F9",
                vec![Action::MacroRef { macro_id: "gone".to_string() }],
            )],
            TEST_TITLE,
            &[],
        );
        assert!(out.contains("F9::\n{\n}\n"));
    }

    // The frontend sends {"type":"macro"} (MacroAction), so the tag must be
    // exactly "macro" -- otherwise actions_lenient drops every macro ref.
    #[test]
    fn macro_ref_parses_from_macro_tag() {
        let parsed: Action =
            serde_json::from_str(r#"{"type":"macro","macro_id":"m1"}"#).unwrap();
        match parsed {
            Action::MacroRef { macro_id } => assert_eq!(macro_id, "m1"),
            other => panic!("beklenen MacroRef, gelen {other:?}"),
        }
    }

    // Fire-on-release appends the Up suffix: F9 becomes "F9 Up::".
    #[test]
    fn up_suffix_fires_on_release() {
        let mut t = trig("F9", vec![]);
        t.fire_on_release = true;
        let out = compile_to_ahk_v2(&[t], TEST_TITLE, &[]);
        assert!(out.contains("F9 Up::\n"));
    }

    // A left/right side on a modifier emits the angle prefix: left Ctrl
    // plus F9 becomes "<^F9::".
    #[test]
    fn modifier_side_emits_angle_prefix() {
        let mut t = trig("Ctrl+F9", vec![]);
        t.mod_sides.insert("Ctrl".to_string(), ModSide::Left);
        let out = compile_to_ahk_v2(&[t], TEST_TITLE, &[]);
        assert!(out.contains("<^F9::\n"));

        let mut t = trig("Alt+F9", vec![]);
        t.mod_sides.insert("Alt".to_string(), ModSide::Right);
        let out = compile_to_ahk_v2(&[t], TEST_TITLE, &[]);
        assert!(out.contains(">!F9::\n"));
    }

    // What the recorder stores for AltGr+M: a plain combo plus left-Ctrl /
    // right-Alt sides, which is exactly the "<^>!" AltGr form.
    #[test]
    fn altgr_records_as_left_ctrl_right_alt() {
        let mut t = trig("Ctrl+Alt+M", vec![]);
        t.mod_sides.insert("Ctrl".to_string(), ModSide::Left);
        t.mod_sides.insert("Alt".to_string(), ModSide::Right);
        let out = compile_to_ahk_v2(&[t], TEST_TITLE, &[]);
        assert!(out.contains("<^>!M::\n"));
    }

    // Down and Up variants of the same shortcut are distinct hotkeys, so
    // deduplication must not collapse them.
    #[test]
    fn up_and_down_variants_coexist() {
        let mut released = trig("F9", vec![]);
        released.fire_on_release = true;
        let out = compile_to_ahk_v2(&[trig("F9", vec![]), released], TEST_TITLE, &[]);
        assert_eq!(out.matches("F9 Up::").count(), 1);
        assert_eq!(out.matches("::\n").count(), 2);
    }

    // Triggers written before these fields existed parse as plain
    // press-down, either-side hotkeys.
    #[test]
    fn trigger_modifiers_default_to_plain_press() {
        let old = serde_json::json!({
            "shortcut": "F9", "block_key": false, "actions": []
        });
        let t: Trigger = serde_json::from_value(old).unwrap();
        assert!(!t.fire_on_release);
        assert!(t.mod_sides.is_empty());
        assert!(!t.wildcard);
        assert!(!t.force_hook);
    }

    // Wildcard fires even when extra modifiers are held ("*F9::").
    #[test]
    fn wildcard_prefix_fires_with_extra_modifiers() {
        let mut t = trig("F9", vec![]);
        t.wildcard = true;
        let out = compile_to_ahk_v2(&[t], TEST_TITLE, &[]);
        assert!(out.contains("*F9::\n"));
    }

    // The hook prefix stops Send from firing the hotkey itself ("$F9::").
    #[test]
    fn hook_prefix_forces_keyboard_hook() {
        let mut t = trig("F9", vec![]);
        t.force_hook = true;
        let out = compile_to_ahk_v2(&[t], TEST_TITLE, &[]);
        assert!(out.contains("$F9::\n"));
    }

    // Prefixes stack in one order: hook, passthrough, wildcard ("$~*",
    // matching the "$#z" convention of the dollar-first examples).
    #[test]
    fn prefixes_stack_in_canonical_order() {
        let mut t = passthrough("F9", vec![]);
        t.wildcard = true;
        t.force_hook = true;
        t.fire_on_release = true;
        let out = compile_to_ahk_v2(&[t], TEST_TITLE, &[]);
        assert!(out.contains("$~*F9 Up::\n"));
    }

    // A wildcard variant is a distinct hotkey from the plain one, so both
    // survive. A hook-only difference is not: "$" changes hook usage, not
    // identity, so the first trigger wins (same rule as block_key).
    #[test]
    fn wildcard_variants_coexist_hook_only_collapses() {
        let mut wild = trig("F9", vec![]);
        wild.wildcard = true;
        let out = compile_to_ahk_v2(&[trig("F9", vec![]), wild], TEST_TITLE, &[]);
        assert_eq!(out.matches("::\n").count(), 2);

        let mut hooked = trig("F9", vec![]);
        hooked.force_hook = true;
        let out = compile_to_ahk_v2(&[trig("F9", vec![]), hooked], TEST_TITLE, &[]);
        assert_eq!(out.matches("::\n").count(), 1);
    }

    // Type Text is removed: old {"type":"keys"} actions drop on parse so the
    // profile itself stays loadable, same rule as the removed custom actions.
    #[test]
    fn legacy_keys_action_is_dropped_on_parse() {
        let old = serde_json::json!({
            "shortcut": "F9", "block_key": false,
            "actions": [
                {"type": "keys", "keys": "hi"},
                {"type": "mouse", "button": "Left", "x": 0, "y": 0}
            ]
        });
        let t: Trigger = serde_json::from_value(old).unwrap();
        assert_eq!(t.actions.len(), 1);
    }

    // Old macros whose blocks are all {"kind":"keys"} parse to empty blocks
    // instead of failing the whole macro load.
    #[test]
    fn keys_only_macro_blocks_parse_to_empty() {
        let old = serde_json::json!({
            "id": "m1", "name": "Old",
            "blocks": [{"kind": "keys", "keys": "ab"}]
        });
        let m: Macro = serde_json::from_value(old).unwrap();
        assert!(m.blocks.is_empty());
    }
}
