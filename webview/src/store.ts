import { writable } from "svelte/store";
import type { Mode, Preset } from "../../shared";

export const modeStore = writable<Mode[]>([]);
export const uniqueModeStore = writable<Mode[]>([]);
export const activeMode = writable<Mode>();
export const activeModePrompts = writable<any[]>([]);
export const activeModePresets = writable<Preset[]>([]);

export const presets = writable<Preset[]>([]);
export const activePreset = writable<Preset>();
