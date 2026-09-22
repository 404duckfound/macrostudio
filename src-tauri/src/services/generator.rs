use serde::Deserialize;

/// RESEARCH.md bolum 5: Tip-guvenli sablon / metin uretimi (AST yok).
#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Action {
    SendKeys { payload: String },
    Delay { ms: u32 },
    MouseClick { button: String, x: i32, y: i32 },
}

pub fn compile_to_ahk_v2(trigger: &str, actions: &[Action]) -> String {
    let mut script = String::from("#Requires AutoHotkey v2.0\n\n");
    let ahk_trigger = map_shortcut_to_ahk(trigger);
    script.push_str(&format!("{ahk_trigger}::{{\n"));

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
        }
    }

    script.push_str("}\n");
    script
}

fn map_shortcut_to_ahk(input: &str) -> String {
    input
        .replace("Ctrl", "^")
        .replace("Alt", "!")
        .replace("Shift", "+")
        .replace("Win", "#")
        .replace('+', "")
}
