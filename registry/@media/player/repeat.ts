import type { RepeatMode } from "./types";

export const REPEAT_MODES = ["off", "all", "one"] as const;

export function repeatIn(value: unknown): RepeatMode {
	const said = String(value ?? "");
	return REPEAT_MODES.find((mode) => mode === said) ?? "off";
}
