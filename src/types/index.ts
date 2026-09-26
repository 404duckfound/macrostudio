export type ActionBlock =
  | { kind: "keys"; keys: string }
  | { kind: "mouse"; button: string; x: number; y: number }
  | { kind: "delay"; ms: number };

export type MacroAction =
  | { type: "keys"; keys: string }
  | { type: "mouse"; button: string; x: number; y: number }
  | { type: "custom"; blocks: ActionBlock[] }
  | { type: "script"; code: string };

export interface Trigger {
  shortcut: string;
  actions: MacroAction[];
}

export interface Profile {
  id: string;
  name: string;
  triggers: Trigger[];
  target_exe?: string | null;
  enabled: boolean;
  block_key: boolean;
}
