export type ActionType = "send_keys" | "delay" | "mouse_click" | "custom";

export interface SendKeysAction {
  type: "send_keys";
  payload: string;
}

export interface DelayAction {
  type: "delay";
  ms: number;
}

export interface MouseClickAction {
  type: "mouse_click";
  button: string;
  x: number;
  y: number;
}

export interface CustomAction {
  type: "custom";
  code: string;
}

export type MacroAction = SendKeysAction | DelayAction | MouseClickAction | CustomAction;

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
