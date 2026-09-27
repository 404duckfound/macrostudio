use serde::{Deserialize, Serialize};

/// RESEARCH.md bolum 5: Tip-guvenli sablon / metin uretimi (AST yok).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Action {
    Keys { #[serde(default)] keys: String },
    Mouse {
        #[serde(default = "default_mouse_button")]
        button: String,
        #[serde(default)] x: i32,
        #[serde(default)] y: i32,
    },
    Custom { #[serde(default)] blocks: Vec<Block> },
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
    Keys { #[serde(default)] keys: String },
    Mouse {
        #[serde(default = "default_mouse_button")]
        button: String,
        #[serde(default)] x: i32,
        #[serde(default)] y: i32,
    },
    Delay { #[serde(default)] ms: u32 },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum KeyBehavior {
    Tap,
    HoldDown,
    Release,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Trigger {
    pub shortcut: String,
    #[serde(default)]
    pub actions: Vec<Action>,
}

pub fn compile_to_ahk_v2(triggers: &[Trigger], block_key: bool) -> String {
    let mut script = String::from("#Requires AutoHotkey v2.0\n\n");
    // Yutmak icin `~` koymamak yeterli. `*` hook modifier'idir: tetiklenme
    // zamanini degistirir (key-up'i da yakalar, ek modifier ile de tetiklenir).
    let prefix = if block_key { "" } else { "~" };
    let mut seen = std::collections::HashSet::new();
    let blocks: Vec<(String, &Trigger)> = triggers
        .iter()
        .filter(|t| !t.shortcut.trim().is_empty())
        .map(|t| (format!("{prefix}{}", map_shortcut_to_ahk(t.shortcut.trim())), t))
        .filter(|(k, _)| seen.insert(k.clone()))
        .collect();
    for (key, trigger) in &blocks {
        script.push_str(&format!("{key}::\n{{\n"));
        for action in &trigger.actions {
            match action {
                Action::Keys { keys } => {
                    script.push_str(&send_line(keys));
                }
                Action::Mouse { button, x, y } => {
                    script.push_str(&mouse_click_line(button, *x, *y));
                }
                Action::Custom { blocks } => {
                    for block in blocks {
                        match block {
                            Block::Keys { keys } => {
                                script.push_str(&send_line(keys));
                            }
                            Block::Mouse { button, x, y } => {
                                script.push_str(&mouse_click_line(button, *x, *y));
                            }
                            Block::Delay { ms } => {
                                script.push_str(&format!("    Sleep({ms})\n"));
                            }
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
                    script.push_str(&key_action_lines(key, *behavior, *pre_delay_ms, *repeat));
                }
            }
        }
        script.push_str("}\n");
    }
    script
}

fn send_line(keys: &str) -> String {
    let escaped = keys.replace('"', "`\"");
    format!("    Send(\"{escaped}\")\n")
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

fn key_action_lines(key: &str, behavior: KeyBehavior, pre_delay_ms: u32, repeat: u32) -> String {
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
        KeyBehavior::HoldDown | KeyBehavior::Release => {
            let call = if behavior == KeyBehavior::HoldDown {
                "KeyDown"
            } else {
                "KeyUp"
            };
            parts
                .iter()
                .map(|p| format!("    {call}(\"{}\")\n", native_key_name(p)))
                .collect()
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

fn map_shortcut_to_ahk(input: &str) -> String {
    input
        .split('+')
        .map(|part| match part.trim() {
            "Ctrl" => "^",
            "Alt" => "!",
            "Shift" => "+",
            "Win" => "#",
            "MouseLeft" => "LButton",
            "MouseRight" => "RButton",
            "MouseMiddle" => "MButton",
            "MouseX1" => "XButton1",
            "MouseX2" => "XButton2",
            other => other,
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
        }
    }

    fn custom(blocks: Vec<Block>) -> Action {
        Action::Custom { blocks }
    }

    #[test]
    fn each_trigger_gets_own_body() {
        let out = compile_to_ahk_v2(
            &[
                trig(
                    "Ctrl+Shift+F1",
                    vec![Action::Keys { keys: "hi".to_string() }],
                ),
                trig(
                    "F9",
                    vec![custom(vec![Block::Delay { ms: 10 }])],
                ),
            ],
            true,
        );
        assert!(out.contains("^+F1::\n{\n    Send(\"hi\")\n}\n"));
        assert!(out.contains("F9::\n{\n    Sleep(10)\n}\n"));
    }

    #[test]
    fn mouse_action_clicks_pointer_or_coords() {
        let out = compile_to_ahk_v2(
            &[trig(
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
            )],
            true,
        );
        assert!(out.contains("    Click(\"Right\")\n    Click(5, 6, \"Left\")\n"));
    }

    #[test]
    fn custom_blocks_mix_keys_mouse_delay() {
        let out = compile_to_ahk_v2(
            &[trig(
                "F9",
                vec![custom(vec![
                    Block::Keys { keys: "ab".to_string() },
                    Block::Delay { ms: 50 },
                    Block::Mouse {
                        button: "Left".to_string(),
                        x: 10,
                        y: 20,
                    },
                ])],
            )],
            true,
        );
        assert!(out.contains("    Send(\"ab\")\n    Sleep(50)\n    Click(10, 20, \"Left\")\n"));
    }

    #[test]
    fn zero_coords_click_current_pointer() {
        let out = compile_to_ahk_v2(
            &[trig(
                "F9",
                vec![custom(vec![Block::Mouse {
                    button: "Right".to_string(),
                    x: 0,
                    y: 0,
                }])],
            )],
            true,
        );
        assert!(out.contains("    Click(\"Right\")\n"));
        assert!(!out.contains("Click(0, 0,"));
    }

    #[test]
    fn suppress_on_emits_bare_hotkey() {
        let out = compile_to_ahk_v2(&[trig("F9", vec![])], true);
        assert!(out.contains("\nF9::"));
        assert!(!out.contains("*F9::"));
        assert!(!out.contains("~F9::"));
    }

    #[test]
    fn suppress_off_prefixes_tilde() {
        let out = compile_to_ahk_v2(&[trig("F9", vec![])], false);
        assert!(out.contains("~F9::"));
        assert!(!out.contains("*F9::"));
    }

    #[test]
    fn empty_triggers_emit_no_hotkey() {
        let out = compile_to_ahk_v2(&[], true);
        assert!(!out.contains("::"));
        assert!(out.starts_with("#Requires AutoHotkey v2.0"));
    }

    #[test]
    fn shortcutless_triggers_emit_nothing() {
        let out = compile_to_ahk_v2(
            &[trig("", vec![custom(vec![Block::Delay { ms: 5 }])]), trig("F9", vec![])],
            true,
        );
        assert_eq!(out.matches("::").count(), 1);
        assert!(!out.contains("Sleep(5)"));
    }

    #[test]
    fn script_action_emitted_verbatim() {
        let out = compile_to_ahk_v2(
            &[trig(
                "F9",
                vec![Action::Script {
                    code: "MsgBox(\"a\")\nSleep(10)".to_string(),
                }],
            )],
            true,
        );
        assert!(out.contains("    MsgBox(\"a\")\n    Sleep(10)\n"));
    }

    #[test]
    fn blank_trigger_strings_are_skipped() {
        let out = compile_to_ahk_v2(&[trig("", vec![]), trig("   ", vec![])], true);
        assert!(!out.contains("::"));
    }

    #[test]
    fn duplicate_triggers_emit_single_hotkey() {
        let out = compile_to_ahk_v2(&[trig("F9", vec![]), trig("F9", vec![])], true);
        assert_eq!(out.matches("F9::").count(), 1);
    }

    #[test]
    fn mouse_buttons_map_to_ahk_names() {
        let out = compile_to_ahk_v2(
            &[
                trig("MouseLeft", vec![]),
                trig("MouseRight", vec![]),
                trig("MouseMiddle", vec![]),
                trig("MouseX1", vec![]),
                trig("Ctrl+MouseLeft", vec![]),
            ],
            true,
        );
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
        let out = compile_to_ahk_v2(
            &[trig("F9", vec![key_action("Enter", KeyBehavior::Tap, 0, 1)])],
            true,
        );
        assert!(out.contains("F9::\n{\n    Send(\"{Enter}\")\n}\n"));
        assert!(!out.contains("KeyDown"));
        assert!(!out.contains("Loop"));
    }

    #[test]
    fn key_hold_down_and_release_emit_key_events() {
        let down = compile_to_ahk_v2(
            &[trig("F9", vec![key_action("Ctrl+Alt", KeyBehavior::HoldDown, 0, 1)])],
            true,
        );
        assert!(down.contains("    KeyDown(\"LCtrl\")\n    KeyDown(\"LAlt\")\n"));
        assert!(!down.contains("Send("));

        let up = compile_to_ahk_v2(
            &[trig("F9", vec![key_action("Ctrl+Alt", KeyBehavior::Release, 0, 1)])],
            true,
        );
        assert!(up.contains("    KeyUp(\"LCtrl\")\n    KeyUp(\"LAlt\")\n"));
    }

    #[test]
    fn key_combo_expands_to_braces() {
        let out = compile_to_ahk_v2(
            &[trig("F9", vec![key_action("Ctrl+Shift+Enter", KeyBehavior::Tap, 0, 1)])],
            true,
        );
        assert!(out.contains("    Send(\"{Ctrl}{Shift}{Enter}\")\n"));
    }

    #[test]
    fn key_pre_delay_and_repeat_wrap_in_loop() {
        let out = compile_to_ahk_v2(
            &[trig("F9", vec![key_action("Enter", KeyBehavior::Tap, 200, 4)])],
            true,
        );
        assert!(out.contains("    Sleep(200)\n    Loop 4\n    {\n        Send(\"{Enter}\")\n    }\n"));
        assert_eq!(out.matches("Sleep(200)").count(), 1);
    }

    #[test]
    fn key_repeat_is_normalized_and_ignored_for_hold() {
        let zero = compile_to_ahk_v2(
            &[trig("F9", vec![key_action("Enter", KeyBehavior::Tap, 0, 0)])],
            true,
        );
        assert!(zero.contains("    Send(\"{Enter}\")\n"));
        assert!(!zero.contains("Loop"));

        let held = compile_to_ahk_v2(
            &[trig("F9", vec![key_action("A", KeyBehavior::HoldDown, 0, 9)])],
            true,
        );
        assert!(held.contains("    KeyDown(\"A\")\n"));
        assert!(!held.contains("Loop"));
    }

    #[test]
    fn key_action_with_empty_target_emits_nothing() {
        let out = compile_to_ahk_v2(
            &[trig("F9", vec![key_action("", KeyBehavior::Tap, 0, 1)])],
            true,
        );
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
}
