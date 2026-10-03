import { createElement as h } from "react";
import type { MouseEvent, ReactElement, ReactNode } from "react";
import { Icon, offeredIcons, Switch } from "@widgetarium/kit";
import { GlyphPicker } from "../glyph-picker.js";
import type { GlyphEntry, GlyphSet } from "../glyph-picker.js";
import { Emoji } from "@widgetarium/kit/emojis";
import { EMOJI_TABLE } from "@widgetarium/kit/emoji-table";
import type { TileProp } from "../model.js";
import { declaredOf, typedIn, withTyped } from "../gateway/props.js";
import type { PropBinding } from "../gateway/props.js";
import { isSwitched, parseTyped, typedControlOf, writeProp, writtenPlainly, writtenText } from "./prop-writing.js";
import { draftOnInput, pickRow, popoverFoot } from "./settings-rows.js";
import type { SettingsSpec, SettingsState } from "./settings-state.js";
import { collectionFields } from "./typed-rows.js";

const NOT_JSON = "That is not valid JSON, so the value was not kept.";

const NOT_A_LIST = "This prop is a collection, so the value must be a JSON array.";

const UNPARSED = Symbol("unparsed");

const PICKER_OF_CONTROL: ReadonlyMap<unknown, GlyphSet> = new Map<unknown, GlyphSet>([
	[
		"emoji",
		{
			draw: Emoji,
			entries: () => EMOJI_ENTRIES,
			placeholder: "Search emoji",
			nothingFound: "No emoji answers to that name.",
		},
	],
	[
		"icon",
		{
			draw: Icon,
			entries: offeredIcons,
			placeholder: "Search icons",
			nothingFound: "No icon answers to that name.",
		},
	],
]);

export function typedBody(state: SettingsState, key: string, spec: SettingsSpec, config: TileProp): ReactNode[] {
	const picker = PICKER_OF_CONTROL.get(spec.control);
	if (picker) return pickerBody(state, key, spec, config, picker);
	const shown = writtenText(spec, typedIn(spec, config) ?? declaredOf(spec));
	return [
		h(typedControlOf(spec), {
			block: true,
			key: "field",
			value: state.draft ?? "",
			placeholder: shown || (writtenPlainly(spec) ? "A value" : "A JSON value"),
			onInput: draftOnInput(state),
		}),
		popoverFoot(
			state,
			() => state.setDraft(shown),
			(typed) => applyTyped(state, key, spec, config, typed),
		),
	];
}

export function typedLabel(spec: SettingsSpec, config: TileProp): string {
	if (collectionFields(spec)) return "Typed here";
	if (isSwitched(spec)) return heldBoolean(spec, config) ? "On" : "Off";
	return writtenText(spec, typedIn(spec, config) ?? declaredOf(spec)) || "Empty";
}

export function switchedValue(state: SettingsState, key: string, spec: SettingsSpec, config: TileProp): ReactElement {
	const flip = (next: boolean): void => writeProp(state, key, spec, withTyped(spec, config, next));
	return h(
		"span",
		{ className: "wg-set-switch", onClick: (event: MouseEvent) => event.stopPropagation() },
		h(Switch, { checked: heldBoolean(spec, config), label: spec.label ?? key, onChange: flip }),
	);
}

export function choiceBody(state: SettingsState, key: string, spec: SettingsSpec, config: TileProp): ReactElement[] {
	const now = typedTextOf(spec, config);
	const take = (value: string): void => {
		writeProp(state, key, spec, withTyped(spec, config, value));
		state.openEditor(null);
	};
	return (spec.options ?? []).map((choice) =>
		pickRow(choice.value, choice.label, () => take(choice.value), choice.value === now),
	);
}

export function chosenLabel(spec: SettingsSpec, config: TileProp): string {
	const now = typedTextOf(spec, config);
	return (spec.options ?? []).find((choice) => choice.value === now)?.label ?? now;
}

export function pickedRowValue(spec: SettingsSpec, config: TileProp, binding: PropBinding): ReactElement | null {
	const picker = PICKER_OF_CONTROL.get(spec.control);
	const name = picker && binding === "hardcode" ? typedTextOf(spec, config) : "";
	if (!picker || !name) return null;
	return h("span", { className: "wg-set-picked" }, [
		h(picker.draw, { name, size: 18, key: "glyph" }),
		h("span", { className: "wg-set-path", key: "name" }, name),
	]);
}

function applyTyped(state: SettingsState, key: string, spec: SettingsSpec, config: TileProp, typed: string): void {
	if (writtenPlainly(spec)) {
		writeProp(state, key, spec, withTyped(spec, config, parseTyped(spec, typed)));
		return;
	}
	const parsed = parsedJson(typed);
	if (parsed === UNPARSED) {
		state.host?.ui?.notify?.(NOT_JSON);
		return;
	}
	if (spec.kind !== "value" && !Array.isArray(parsed)) {
		state.host?.ui?.notify?.(NOT_A_LIST);
		return;
	}
	writeProp(state, key, spec, withTyped(spec, config, parsed));
}

function parsedJson(typed: string): unknown {
	try {
		return JSON.parse(typed);
	} catch {
		return UNPARSED;
	}
}

function typedTextOf(spec: SettingsSpec, config: TileProp): string {
	const held = typedIn(spec, config) ?? declaredOf(spec);
	return held === undefined || held === null ? "" : String(held);
}

function pickerBody(
	state: SettingsState,
	key: string,
	spec: SettingsSpec,
	config: TileProp,
	picker: GlyphSet,
): ReactNode[] {
	const pick = (name: string): void => {
		writeProp(state, key, spec, withTyped(spec, config, name));
		state.openEditor(null);
	};
	return [h(GlyphPicker, { key: "picker", picker, value: typedTextOf(spec, config), onPick: pick })];
}

function heldBoolean(spec: SettingsSpec, config: TileProp): boolean {
	return Boolean(typedIn(spec, config) ?? declaredOf(spec));
}

const EMOJI_ENTRIES: readonly GlyphEntry[] = Object.keys(EMOJI_TABLE).map((name) => ({ name, words: "" }));
