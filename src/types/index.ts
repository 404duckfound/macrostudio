export type ActionBlock =
  | { kind: "mouse"; button: string; x: number; y: number }
  | { kind: "delay"; ms: number };

export type KeyBehavior = "tap" | "hold_down" | "release";

export type MacroAction =
  | {
      type: "key";
      key: string;
      behavior: KeyBehavior;
      pre_delay_ms: number;
      repeat: number;
    }
  | { type: "mouse"; button: string; x: number; y: number }
  | { type: "macro"; macro_id: string }
  | { type: "script"; code: string };

export interface Macro {
  id: string;
  name: string;
  blocks: ActionBlock[];
}

export interface Trigger {
  shortcut: string;
  actions: MacroAction[];
  block_key: boolean;
}

export interface Profile {
  id: string;
  name: string;
  triggers: Trigger[];
  target_exe: string | null;
  enabled: boolean;
}
