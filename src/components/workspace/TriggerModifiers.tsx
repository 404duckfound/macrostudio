import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Asterisk,
  ChevronDown,
  ChevronUp,
  Equal,
  Minus,
  Zap,
} from "lucide-react";
import type { ModSide, Trigger } from "../../types";
import BlockKeyToggle from "./BlockKeyToggle";
import Chips from "./Chips";
import { pruneSides } from "./triggerDraft";

const MODIFIERS = ["Ctrl", "Shift", "Alt", "Win", "Meta"] as const;

const SIDES: { value: ModSide | ""; label: string }[] = [
  { value: "", label: "Either" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
];

export default function TriggerModifiers({
  trigger,
  onPatch,
}: {
  trigger: Trigger;
  onPatch: (patch: (t: Trigger) => Trigger) => void;
}) {
  const present = trigger.shortcut
    .split("+")
    .map((p) => p.trim())
    .filter((p) => (MODIFIERS as readonly string[]).includes(p));
  const active: string[] = [
    ...(trigger.force_hook ? ["$"] : []),
    ...(trigger.wildcard ? ["*"] : []),
    ...(trigger.fire_on_release ? ["Up"] : []),
    ...Object.entries(trigger.mod_sides)
      .filter(([m]) => present.includes(m))
      .map(([m, s]) => `${s === "left" ? "<" : ">"}${m}`),
  ];
  const [open, setOpen] = useState(active.length > 0);

  function setSide(mod: string, side: ModSide | "") {
    onPatch((t) => {
      const next = { ...t.mod_sides };
      if (side === "") delete next[mod];
      else next[mod] = side;
      return { ...t, mod_sides: pruneSides(t.shortcut, next) };
    });
  }

  return (
    <section className="inspector-section" aria-label="Trigger Modifiers">
      <button
        type="button"
        className="section-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="section-label">Trigger Modifiers</span>
        {active.length > 0 && (
          <span className="section-summary">{active.join(" · ")}</span>
        )}
        <span className="section-chevron" aria-hidden="true">
          {open ? <ChevronUp /> : <ChevronDown />}
        </span>
      </button>
      {open && (
        <>
          <div className="block-card">
            <div className="block-card-info">
              <div className="block-card-title-row">
                <span className="toggle-title">Fire on release</span>
                <span
                  className={`toggle-state-badge ${trigger.fire_on_release ? "badge-on" : "badge-pass"}`}
                >
                  {trigger.fire_on_release ? (
                    <>
                      <ArrowUp className="badge-icon" aria-hidden="true" /> Up
                    </>
                  ) : (
                    <>
                      <ArrowDown className="badge-icon" aria-hidden="true" /> Down
                    </>
                  )}
                </span>
              </div>
              <span className="toggle-sub">
                {trigger.fire_on_release
                  ? "Trigger fires when the key is released (Up suffix)"
                  : "Trigger fires when the key is pressed"}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-label="Fire on release"
              aria-checked={trigger.fire_on_release}
              className={`switch ${trigger.fire_on_release ? "switch-on" : ""}`}
              onClick={() =>
                onPatch((t) => ({ ...t, fire_on_release: !t.fire_on_release }))
              }
            >
              <span className="switch-thumb" />
            </button>
          </div>
          <BlockKeyToggle
            value={trigger.block_key}
            onChange={(block_key) =>
              onPatch((t) => ({ ...t, block_key }))
            }
          />
          <div className="block-card">
            <div className="block-card-info">
              <div className="block-card-title-row">
                <span className="toggle-title">Wildcard</span>
                <span
                  className={`toggle-state-badge ${trigger.wildcard ? "badge-on" : "badge-pass"}`}
                >
                  {trigger.wildcard ? (
                    <>
                      <Asterisk className="badge-icon" aria-hidden="true" /> *
                    </>
                  ) : (
                    <>
                      <Equal className="badge-icon" aria-hidden="true" /> Exact
                    </>
                  )}
                </span>
              </div>
              <span className="toggle-sub">
                {trigger.wildcard
                  ? "Fires even when extra modifiers are held (*)"
                  : "Requires exactly these modifiers"}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-label="Wildcard"
              aria-checked={trigger.wildcard}
              className={`switch ${trigger.wildcard ? "switch-on" : ""}`}
              onClick={() =>
                onPatch((t) => ({ ...t, wildcard: !t.wildcard }))
              }
            >
              <span className="switch-thumb" />
            </button>
          </div>
          <div className="block-card">
            <div className="block-card-info">
              <div className="block-card-title-row">
                <span className="toggle-title">Keyboard hook</span>
                <span
                  className={`toggle-state-badge ${trigger.force_hook ? "badge-on" : "badge-pass"}`}
                >
                  {trigger.force_hook ? (
                    <>
                      <Zap className="badge-icon" aria-hidden="true" /> $
                    </>
                  ) : (
                    <>
                      <Minus className="badge-icon" aria-hidden="true" /> Normal
                    </>
                  )}
                </span>
              </div>
              <span className="toggle-sub">
                {trigger.force_hook
                  ? "Send cannot fire this hotkey itself ($)"
                  : "Send can fire this hotkey"}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-label="Keyboard hook"
              aria-checked={trigger.force_hook}
              className={`switch ${trigger.force_hook ? "switch-on" : ""}`}
              onClick={() =>
                onPatch((t) => ({ ...t, force_hook: !t.force_hook }))
              }
            >
              <span className="switch-thumb" />
            </button>
          </div>
          {present.map((m) => {
            const side = trigger.mod_sides[m] ?? "";
            return (
              <div key={m} className="mod-side-row">
                <span className="action-group-label mod-side-label">
                  <Chips parts={[m]} />
                  <span>side</span>
                </span>
                <div
                  className="segmented mod-side-segmented"
                  role="radiogroup"
                  aria-label={`${m} side`}
                >
                  {SIDES.map((s) => (
                    <button
                      key={s.value || "either"}
                      type="button"
                      role="radio"
                      aria-checked={side === s.value}
                      className={`segment ${side === s.value ? "segment-on" : ""}`}
                      onClick={() => setSide(m, s.value)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}
    </section>
  );
}
