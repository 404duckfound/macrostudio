#!/usr/bin/env node
// Design token drift check: the hex values in DESIGN.md's frontmatter have to
// match the CSS custom properties in src/theme.css. The stylesheet is the
// source of truth (it is what renders), DESIGN.md is its documented mirror.
//
// Run manually with `pnpm check:design`. It is deliberately not part of the
// build: a color edit should fail this check loudly, not break `pnpm build`.
//
// DESIGN.md carries the wider Material 3 palette, so only the keys that exist
// on both sides are compared; the map below is that shared surface.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// DESIGN.md colors key -> theme.css custom property.
const TOKENS = {
  background: "--bg-base",
  surface: "--bg-base",
  "surface-container-low": "--bg-surface",
  "surface-bright": "--bg-surface-elevated",
  "surface-container-high": "--bg-surface-elevated",
  "surface-container-highest": "--bg-interactive",
  "surface-variant": "--bg-interactive",
  "on-surface": "--text-primary",
  "on-background": "--text-primary",
  "on-surface-variant": "--text-secondary",
  outline: "--text-disabled",
  "surface-tint": "--accent-primary",
  primary: "--accent-primary",
  "on-primary": "--accent-on",
  "primary-container": "--accent-primary-hover",
  "inverse-primary": "--accent-primary-hover",
  secondary: "--status-success",
  tertiary: "--status-warning",
  error: "--status-danger",
};

function normalize(hex) {
  let value = String(hex).trim().replace(/^["']|["']$/g, "").replace(/^#/, "").toLowerCase();
  if (value.length === 3) {
    value = value
      .split("")
      .map((c) => c + c)
      .join("");
  }
  return value;
}

function readThemeTokens(css) {
  const rootBlock = css.match(/:root\s*\{([\s\S]*?)\}/);
  if (!rootBlock) throw new Error("src/theme.css has no :root block");

  const tokens = new Map();
  for (const declaration of rootBlock[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    const hex = declaration[2].match(/#([0-9a-fA-F]{3,8})/);
    if (hex) tokens.set(declaration[1], normalize(hex[1]));
  }
  return tokens;
}

function readDesignColors(markdown) {
  const frontmatter = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatter) throw new Error("DESIGN.md has no frontmatter");

  const lines = frontmatter[1].split(/\r?\n/);
  const start = lines.findIndex((line) => /^colors:\s*$/.test(line));
  if (start < 0) throw new Error("DESIGN.md frontmatter has no colors block");

  const colors = new Map();
  for (const line of lines.slice(start + 1)) {
    // The colors block ends at the next top-level key (typography, ...).
    if (/^\S/.test(line)) break;
    const entry = line.match(/^\s{2}([a-z0-9-]+):\s*(.+?)\s*$/);
    if (!entry) continue;
    const hex = entry[2].match(/#?([0-9a-fA-F]{3,8})/);
    if (hex) colors.set(entry[1], normalize(hex[1]));
  }
  return colors;
}

const theme = readThemeTokens(readFileSync(resolve(root, "src/theme.css"), "utf8"));
const design = readDesignColors(readFileSync(resolve(root, "DESIGN.md"), "utf8"));

const problems = [];
let checked = 0;

for (const [designKey, token] of Object.entries(TOKENS)) {
  const themeHex = theme.get(token);
  const designHex = design.get(designKey);

  if (!themeHex) {
    problems.push(`theme.css is missing ${token} (DESIGN.md colors.${designKey})`);
    continue;
  }
  if (!designHex) {
    problems.push(`DESIGN.md colors.${designKey} is missing (theme.css ${token})`);
    continue;
  }
  checked += 1;
  if (themeHex !== designHex) {
    problems.push(
      `colors.${designKey} = #${designHex} but ${token} = #${themeHex}`,
    );
  }
}

console.log(`theme.css tokens: ${theme.size}, DESIGN.md colors: ${design.size}`);
console.log(`mapped pairs checked: ${checked}/${Object.keys(TOKENS).length}\n`);

if (problems.length > 0) {
  for (const problem of problems) console.error(`x ${problem}`);
  console.error(
    `\n${problems.length} token(s) out of sync. theme.css is the source of truth: update DESIGN.md.`,
  );
  process.exit(1);
}

console.log("ok - DESIGN.md frontmatter matches src/theme.css");
