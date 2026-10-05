export type ActionBlock =
  | { kind: "keys"; keys: string }
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
  | { type: "keys"; keys: string }
  | { type: "mouse"; button: string; x: number; y: number }
  | { type: "custom"; blocks: ActionBlock[] }
  | { type: "script"; code: string };

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
