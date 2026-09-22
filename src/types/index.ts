export type ActionType = "send_keys" | "delay" | "mouse_click";

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

export type MacroAction = SendKeysAction | DelayAction | MouseClickAction;

export interface Profile {
  id: string;
  name: string;
  trigger: string;
  target_exe?: string | null;
  enabled: boolean;
  actions: MacroAction[];
}
