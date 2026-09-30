import { propConfig } from "../model.js";
import type { Tile, TileProp } from "../model.js";
import { Field, TextArea } from "@widgetarium/kit";
import { declaredOf } from "../gateway/props.js";
import type { SettingsSpec, TilePatch } from "./settings-state.js";

export type TypedControl = typeof Field;

interface PlainWriting {
	readonly blank: string | number | boolean;
	readonly control: TypedControl;
}

export interface PropWritingState {
	readonly tile: Pick<Tile, "props">;
	readonly onPatch: (patch: TilePatch) => void;
}

const PLAIN_TYPES: ReadonlyMap<unknown, PlainWriting> = new Map<unknown, PlainWriting>([
	["line", { blank: "", control: Field }],
	["text", { blank: "", control: TextArea }],
	["number", { blank: 0, control: Field }],
	["boolean", { blank: false, control: Field }],
]);

export const TYPED_HERE = "typed";

export const IN_VAULT = "vault";

export const FROM_WIDGET = "ref";

export const FIELDS_SHOWN = 6;

export const STATISTICS = "stat";

export function propConfigOf(state: Pick<PropWritingState, "tile">, key: string, spec: SettingsSpec): TileProp {
	return propConfig(state.tile, key, spec);
}

export function writtenPlainly(spec: SettingsSpec): boolean {
	return spec.kind === "value" && PLAIN_TYPES.has(spec.type);
}

export function typedControlOf(spec: SettingsSpec): TypedControl {
	if (spec.kind !== "value") return Field;
	return PLAIN_TYPES.get(spec.type)?.control ?? Field;
}

export function isSwitched(spec: SettingsSpec): boolean {
	return spec.kind === "value" && spec.type === "boolean";
}

export function writtenText(spec: SettingsSpec, held: unknown): string {
	if (held === undefined) return "";
	return writtenPlainly(spec) ? String(held) : JSON.stringify(held);
}

export function blankValue(spec: SettingsSpec): unknown {
	if (declaredOf(spec) !== undefined) return declaredOf(spec);
	if (spec.type) return PLAIN_TYPES.get(spec.type)?.blank ?? "";
	return spec.kind === "value" ? "" : [];
}

export function parseTyped(spec: SettingsSpec, typed: string): string | number {
	return spec.type === "number" ? Number(typed) : typed.trim();
}

// TRADE-OFF: not rekeyed() — that MERGES, and switching a prop to its own box writes a record with keys deliberately dropped
export function writeProp(
	state: PropWritingState,
	key: string,
	spec: SettingsSpec | null | undefined,
	config: TileProp,
): void {
	const formerNames = namesIn(spec?.aka);
	const kept = Object.entries(state.tile.props ?? {}).filter(([propName]) => !formerNames.includes(propName));
	const consented =
		config.from === IN_VAULT && config.allow === undefined ? { ...config, allow: [...(spec?.writes ?? [])] } : config;
	state.onPatch({ props: { ...Object.fromEntries(kept), [key]: consented } });
}

function namesIn(aka: unknown): readonly unknown[] {
	if (Array.isArray(aka)) return aka;
	if (aka === undefined || aka === null) return [];
	return [aka];
}
