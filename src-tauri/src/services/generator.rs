use serde::{Deserialize, Serialize};

/// RESEARCH.md bolum 5: Tip-guvenli sablon / metin uretimi (AST yok).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Action {
    SendKeys { payload: String },
    Delay { ms: u32 },
    MouseClick { button: String, x: i32, y: i32 },
    Custom { code: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Trigger {
    pub shortcut: String,
    #[serde(default)]
    pub actions: Vec<Action>,
}

pub fn compile_to_ahk_v2(triggers: &[Trigger], block_key: bool) -> String {
    let mut script = String::from("#Requires AutoHotkey v2.0\n\n");
    let prefix = if block_key { "" } else { "~" };
    let fallback = Trigger {
        shortcut: "F9".to_string(),
        actions: Vec::new(),
    };
    let mut seen = std::collections::HashSet::new();
    let mut blocks: Vec<(String, &Trigger)> = triggers
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
    if blocks.is_empty() {
        blocks.push((format!("{prefix}F9"), &fallback));
    }
    for (key, trigger) in &blocks {
        script.push_str(&format!("{key}::\n{{\n"));
        for action in &trigger.actions {
            match action {
                Action::SendKeys { payload } => {
                    let escaped = payload.replace('"', "`\"");
                    script.push_str(&format!("    Send(\"{escaped}\")\n"));
                }
                Action::Delay { ms } => {
                    script.push_str(&format!("    Sleep({ms})\n"));
                }
                Action::MouseClick { button, x, y } => {
                    script.push_str(&format!("    Click({x}, {y}, \"{button}\")\n"));
                }
                Action::Custom { code } => {
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

fn map_shortcut_to_ahk(input: &str) -> String {
    input
        .split('+')
        .map(|part| match part.trim() {
            "Ctrl" => "^",
            "Alt" => "!",
            "Shift" => "+",
            "Win" => "#",
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

    fn send_keys(payload: &str) -> Action {
        Action::SendKeys {
            payload: payload.to_string(),
        }
    }

    #[test]
    fn each_trigger_gets_own_body() {
        let out = compile_to_ahk_v2(
            &[
                trig("Ctrl+Shift+F1", vec![send_keys("hi")]),
                trig("F9", vec![Action::Delay { ms: 10 }]),
            ],
            true,
        );
        assert!(out.contains("^+F1::\n{\n    Send(\"hi\")\n}\n"));
        assert!(out.contains("F9::\n{\n    Sleep(10)\n}\n"));
    }

    #[test]
    fn suppress_off_prefixes_tilde() {
        let out = compile_to_ahk_v2(&[trig("F9", vec![])], false);
        assert!(out.contains("~F9::"));
    }

    #[test]
    fn empty_triggers_fall_back_to_f9() {
        let out = compile_to_ahk_v2(&[], true);
        assert!(out.contains("F9::"));
    }

    #[test]
    fn custom_action_emitted_verbatim() {
        let out = compile_to_ahk_v2(
            &[trig(
                "F9",
                vec![Action::Custom {
                    code: "MsgBox(\"a\")\nSleep(10)".to_string(),
                }],
            )],
            true,
        );
        assert!(out.contains("    MsgBox(\"a\")\n    Sleep(10)\n"));
    }

    #[test]
    fn blank_trigger_strings_fall_back_to_f9() {
        let out = compile_to_ahk_v2(
            &[trig("", vec![]), trig("   ", vec![])],
            true,
        );
        assert!(out.contains("F9::"));
        assert!(!out.contains("::\n::"));
    }

    #[test]
    fn duplicate_triggers_emit_single_hotkey() {
        let out = compile_to_ahk_v2(&[trig("F9", vec![]), trig("F9", vec![])], true);
        assert_eq!(out.matches("F9::").count(), 1);
    }
}
