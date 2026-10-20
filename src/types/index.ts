export type ActionBlock =
  | { kind: "mouse"; button: string; x: number; y: number }
  | { kind: "delay"; ms: number };

export type KeyBehavior = "tap" | "hold" | "toggle";

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

export type ModSide = "left" | "right";

/**
 * A modifier layer, G-Shift style: while its activator key is physically
 * held, the layer's triggers take over from the normal ones.
 */
export interface Layer {
  id: string;
  name: string;
  /** The key held down to switch the layer on, e.g. "CapsLock". */
  activator: string;
}

export interface Trigger {
  shortcut: string;
  actions: MacroAction[];
  block_key: boolean;
  fire_on_release: boolean;
  mod_sides: Record<string, ModSide>;
  wildcard: boolean;
  force_hook: boolean;
  /** The layer this trigger belongs to (a Layer id). None = the normal layer. */
  layer?: string | null;
}

export interface Profile {
  id: string;
  name: string;
  triggers: Trigger[];
  target_exe: string | null;
  layers: Layer[];
}
