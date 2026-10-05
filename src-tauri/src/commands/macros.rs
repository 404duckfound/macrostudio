use crate::services::generator::Macro;

fn macros_dir() -> Result<std::path::PathBuf, String> {
    let appdata = std::env::var("APPDATA").map_err(|_| "APPDATA bulunamadi".to_string())?;
    let dir = std::path::Path::new(&appdata).join("macro-studio/macros");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

pub fn load_macros() -> Vec<Macro> {
    let Ok(dir) = macros_dir() else {
        return Vec::new();
    };
    let Ok(entries) = std::fs::read_dir(&dir) else {
        return Vec::new();
    };
    let mut out = Vec::new();
    for entry in entries.flatten() {
        if entry.path().extension().and_then(|s| s.to_str()) != Some("json") {
            continue;
        }
        let Ok(content) = std::fs::read_to_string(entry.path()) else {
            continue;
        };
        let Ok(m) = serde_json::from_str::<Macro>(&content) else {
            continue;
        };
        out.push(m);
    }
    out
}

#[tauri::command]
pub fn macro_list() -> Result<Vec<Macro>, String> {
    let _ = macros_dir()?;
    Ok(load_macros())
}

#[tauri::command]
pub fn macro_save(macro_item: Macro) -> Result<(), String> {
    let dir = macros_dir()?;
    let path = dir.join(format!("{}.json", macro_item.id));
    let content = serde_json::to_string_pretty(&macro_item).map_err(|e| e.to_string())?;
    std::fs::write(path, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn macro_delete(macro_id: String) -> Result<(), String> {
    let dir = macros_dir()?;
    let json = dir.join(format!("{macro_id}.json"));
    let _ = std::fs::remove_file(json);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::generator::Block;

    fn sample(id: &str) -> Macro {
        Macro {
            id: id.to_string(),
            name: format!("Macro {id}"),
            blocks: vec![Block::Delay { ms: 25 }],
        }
    }

    #[test]
    fn macro_json_round_trip_keeps_blocks() {
        let m = sample("m1");
        let json = serde_json::to_string(&m).unwrap();
        let back: Macro = serde_json::from_str(&json).unwrap();
        assert_eq!(back.id, "m1");
        assert_eq!(back.blocks.len(), 1);
        assert_eq!(back.name, "Macro m1");
    }

    #[test]
    fn macro_without_blocks_defaults_to_empty() {
        let m: Macro =
            serde_json::from_str(r#"{"id":"m2","name":"Empty"}"#).unwrap();
        assert!(m.blocks.is_empty());
    }
}
