import { propConfig } from "../model.js";
import { Field, TextArea } from "@widgetarium/kit";
import { declaredOf } from "../gateway/props.js";

const PLAIN_TYPES = {
	line: { blank: "", control: Field },
	text: { blank: "", control: TextArea },
	number: { blank: 0, control: Field },
	boolean: { blank: false, control: Field },
};

export const TYPED_HERE = "typed";

export const IN_VAULT = "vault";

export const FROM_WIDGET = "ref";

export const FIELDS_SHOWN = 6;

export const STATISTICS = "stat";

export function propConfigOf(state, key, spec) {
	return propConfig(state.tile, key, spec);
}

export function writtenPlainly(spec) {
	return spec.kind === "value" && Object.hasOwn(PLAIN_TYPES, spec.type);
}

export function typedControlOf(spec) {
	return writtenPlainly(spec) ? PLAIN_TYPES[spec.type].control : Field;
}

export function isSwitched(spec) {
	return spec.kind === "value" && spec.type === "boolean";
}

export function writtenText(spec, held) {
	if (held === undefined) return "";
	return writtenPlainly(spec) ? String(held) : JSON.stringify(held);
}

export function blankValue(spec) {
	if (declaredOf(spec) !== undefined) return declaredOf(spec);
	if (spec.type) return PLAIN_TYPES[spec.type]?.blank ?? "";
	return spec.kind === "value" ? "" : [];
}

export function parseTyped(spec, typed) {
	return spec.type === "number" ? Number(typed) : typed.trim();
}

// TRADE-OFF: not rekeyed() — that MERGES, and switching a prop to its own box writes a record with keys deliberately dropped
export function writeProp(state, key, spec, config) {
	const formerNames = [].concat(spec?.aka ?? []);
	const kept = Object.entries(state.tile.props ?? {}).filter(([propName]) => !formerNames.includes(propName));
	const consented =
		config.from === IN_VAULT && config.allow === undefined ? { ...config, allow: [...(spec?.writes ?? [])] } : config;
	state.onPatch({ props: { ...Object.fromEntries(kept), [key]: consented } });
}
