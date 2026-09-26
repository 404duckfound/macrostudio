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
    // Block acikken `*` tuusu tamamen yutar, kapaliyken `~` ile OS'a gecer.
    let prefix = if block_key { "*" } else { "~" };
    let mut seen = std::collections::HashSet::new();
    let blocks: Vec<(String, &Trigger)> = triggers
        .iter()
        .filter(|t| !t.shortcut.trim().is_empty())
        .map(|t| {
            (
                format!("{prefix}{}", map_shortcut_to_ahk(t.shortcut.trim())),
                t,
            )
        })
        .filter(|(k, _)| seen.insert(k.clone()))
        .collect();
    for (key, trigger) in &blocks {
        script.push_str(&format!("{key}::\n{{\n"));
        for action in &trigger.actions {
            match action {
                Action::Keys { keys } => {
                    let escaped = keys.replace('"', "`\"");
                    script.push_str(&format!("    Send(\"{escaped}\")\n"));
                }
                Action::Mouse { button, x, y } => {
                    script.push_str(&mouse_click_line(button, *x, *y));
                }
                Action::Custom { blocks } => {
                    for block in blocks {
                        match block {
                            Block::Keys { keys } => {
                                let escaped = keys.replace('"', "`\"");
                                script.push_str(&format!("    Send(\"{escaped}\")\n"));
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
            }
        }
        script.push_str("}\n");
    }
    script
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
    fn suppress_on_blocks_with_asterisk() {
        let out = compile_to_ahk_v2(&[trig("F9", vec![])], true);
        assert!(out.contains("*F9::"));
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
}
