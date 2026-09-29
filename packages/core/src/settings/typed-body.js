import { createElement as h } from "react";
import { Icon, offeredIcons, Switch } from "@widgetarium/kit";
import { GlyphPicker } from "../glyph-picker.js";
import { Emoji } from "@widgetarium/kit/emojis";
import { EMOJI_TABLE } from "@widgetarium/kit/emoji-table";
import { declaredOf, typedIn, withTyped } from "../gateway/props.js";
import {
	TYPED_HERE,
	isSwitched,
	typedAs,
	typedControlOf,
	writeProp,
	writtenPlainly,
	writtenText,
} from "./prop-writing.js";
import { pickRow, popoverFoot } from "./settings-rows.js";
import { collectionFields } from "./typed-rows.js";

const PICKER_OF_CONTROL = {
	emoji: {
		draw: Emoji,
		entries: () => EMOJI_ENTRIES,
		placeholder: "Search emoji",
		nothingFound: "No emoji answers to that name.",
	},
	icon: {
		draw: Icon,
		entries: offeredIcons,
		placeholder: "Search icons",
		nothingFound: "No icon answers to that name.",
	},
};

export function typedBody(state, key, spec, config) {
	if (pickerFor(spec)) return pickerBody(state, key, spec, config);
	const shown = writtenText(spec, typedIn(spec, config) ?? declaredOf(spec));
	const apply = (typed) => {
		if (writtenPlainly(spec)) {
			writeProp(state, key, spec, withTyped(spec, { ...config, from: TYPED_HERE }, typedAs(spec, typed)));
			return;
		}
		let parsed;
		try {
			parsed = JSON.parse(typed);
		} catch {
			state.host?.ui?.notify("That is not valid JSON, so the value was not kept.");
			return;
		}
		if (spec.kind !== "value" && !Array.isArray(parsed)) {
			state.host?.ui?.notify("This prop is a collection, so the value must be a JSON array.");
			return;
		}
		writeProp(state, key, spec, withTyped(spec, { ...config, from: TYPED_HERE }, parsed));
	};
	return [
		h(typedControlOf(spec), {
			block: true,
			key: "field",
			value: state.draft ?? "",
			placeholder: shown || (writtenPlainly(spec) ? "A value" : "A JSON value"),
			onInput: (event) => state.setDraft(event.target.value),
		}),
		popoverFoot(state, () => state.setDraft(shown), apply),
	];
}

export function typedLabel(spec, config) {
	if (collectionFields(spec)) return "Typed here";
	if (isSwitched(spec)) return heldBoolean(spec, config) ? "On" : "Off";
	return writtenText(spec, typedIn(spec, config) ?? declaredOf(spec)) || "Empty";
}

export function switchedValue(state, key, spec, config) {
	const flip = (next) => writeProp(state, key, spec, withTyped(spec, { ...config, from: TYPED_HERE }, next));
	return h(
		"span",
		{ className: "wg-set-switch", onClick: (event) => event.stopPropagation() },
		h(Switch, { checked: heldBoolean(spec, config), label: spec.label ?? key, onChange: flip }),
	);
}

export function choiceBody(state, key, spec, config) {
	const now = chosenValue(spec, config);
	const take = (value) => {
		writeProp(state, key, spec, withTyped(spec, { ...config, from: TYPED_HERE }, value));
		state.openEditor(null);
	};
	return spec.options.map((choice) =>
		pickRow(choice.value, choice.label, () => take(choice.value), choice.value === now),
	);
}

export function chosenLabel(spec, config) {
	const now = chosenValue(spec, config);
	return spec.options.find((choice) => choice.value === now)?.label ?? now;
}

export function pickedRowValue(spec, config, binding) {
	const picker = pickerFor(spec);
	const name = picker && binding === "hardcode" ? pickedName(spec, config) : "";
	if (!name) return null;
	return h("span", { className: "wg-set-picked" }, [
		h(picker.draw, { name, size: 18, key: "glyph" }),
		h("span", { className: "wg-set-path", key: "name" }, name),
	]);
}

const EMOJI_ENTRIES = Object.keys(EMOJI_TABLE).map((name) => ({ name, words: "" }));

function pickedName(spec, config) {
	const held = typedIn(spec, config) ?? declaredOf(spec);
	return held === undefined || held === null ? "" : String(held);
}

function pickerFor(spec) {
	return PICKER_OF_CONTROL[spec.control];
}

function pickerBody(state, key, spec, config) {
	const pick = (name) => {
		writeProp(state, key, spec, withTyped(spec, { ...config, from: TYPED_HERE }, name));
		state.openEditor(null);
	};
	return [h(GlyphPicker, { key: "picker", picker: pickerFor(spec), value: pickedName(spec, config), onPick: pick })];
}

function heldBoolean(spec, config) {
	return Boolean(typedIn(spec, config) ?? declaredOf(spec));
}

function chosenValue(spec, config) {
	const held = typedIn(spec, config) ?? declaredOf(spec);
	return held === undefined || held === null ? "" : String(held);
}
