use serde::Deserialize;

/// RESEARCH.md bolum 5: Tip-guvenli sablon / metin uretimi (AST yok).
#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Action {
    SendKeys { payload: String },
    Delay { ms: u32 },
    MouseClick { button: String, x: i32, y: i32 },
    Custom { code: String },
}

pub fn compile_to_ahk_v2(triggers: &[String], block_key: bool, actions: &[Action]) -> String {
    let mut script = String::from("#Requires AutoHotkey v2.0\n\n");
    let prefix = if block_key { "" } else { "~" };
    let mut seen = std::collections::HashSet::new();
    let keys: Vec<String> = triggers
        .iter()
        .map(|t| t.trim())
        .filter(|t| !t.is_empty())
        .map(|t| format!("{prefix}{}", map_shortcut_to_ahk(t)))
        .filter(|k| seen.insert(k.clone()))
        .collect();
    let keys = if keys.is_empty() {
        vec![format!("{prefix}F9")]
    } else {
        keys
    };
    for k in &keys {
        script.push_str(&format!("{k}::\n"));
    }
    script.push_str("{\n");
    for action in actions {
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

    #[test]
    fn stacked_triggers_share_one_body() {
        let out = compile_to_ahk_v2(
            &["Ctrl+Shift+F1".to_string(), "F9".to_string()],
            true,
            &[Action::SendKeys { payload: "hi".to_string() }],
        );
        assert!(out.contains("^+F1::\nF9::\n{\n"));
        assert!(out.contains("Send(\"hi\")"));
    }

    #[test]
    fn suppress_off_prefixes_tilde() {
        let out = compile_to_ahk_v2(&["F9".to_string()], false, &[]);
        assert!(out.contains("~F9::"));
    }

    #[test]
    fn empty_triggers_fall_back_to_f9() {
        let out = compile_to_ahk_v2(&[], true, &[]);
        assert!(out.contains("F9::"));
    }

    #[test]
    fn custom_action_emitted_verbatim() {
        let out = compile_to_ahk_v2(
            &["F9".to_string()],
            true,
            &[Action::Custom { code: "MsgBox(\"a\")\nSleep(10)".to_string() }],
        );
        assert!(out.contains("    MsgBox(\"a\")\n    Sleep(10)\n"));
    }

    #[test]
    fn blank_trigger_strings_fall_back_to_f9() {
        let out = compile_to_ahk_v2(&["".to_string(), "   ".to_string()], true, &[]);
        assert!(out.contains("F9::"));
        assert!(!out.contains("::\n::"));
    }

    #[test]
    fn duplicate_triggers_emit_single_hotkey() {
        let out = compile_to_ahk_v2(&["F9".to_string(), "F9".to_string()], true, &[]);
        assert_eq!(out.matches("F9::").count(), 1);
    }
}
