import { parse as parseYaml } from "yaml";

const BAD_YAML = "That is not valid YAML, so nothing was kept.";

const NOT_A_MAP = "An item is a set of fields, so this has to be a YAML map.";

const UNKNOWN_FIELD = 'The field "{field}" is not one this list keeps.';

const EMPTY_FIELD = 'The field "{field}" is required, so it cannot be left empty.';

const BAD_DATETIME = 'The field "{field}" must be a date and time, like 2026-09-01T09:00:00Z.';

const BAD_BOOLEAN = 'The field "{field}" must be true or false.';

const BOOLEAN_WORDS = new Set(["true", "false"]);

export const said = (sentence, field, note) => sentence.replace("{field}", field).replace("{note}", note);

export function yamlOf(fields, item) {
	return fields
		.map((field) => {
			const held = item[field.key];
			const empty = field.required ? '""' : "null";
			const spelled = field.type === "boolean" ? String(held) : JSON.stringify(String(held));
			return `${field.key}: ${isEmpty(held) ? empty : spelled}${noteOf(field)}`;
		})
		.join("\n");
}

export function readYaml(text, fields) {
	let parsed;
	try {
		parsed = parseYaml(String(text ?? "")) ?? {};
	} catch {
		return { failure: BAD_YAML };
	}
	if (!isMap(parsed)) return { failure: NOT_A_MAP };
	const known = new Set(fields.map((field) => field.key));
	const stray = Object.keys(parsed).find((name) => !known.has(name));
	if (stray) return { failure: said(UNKNOWN_FIELD, stray) };
	const item = {};
	for (const field of fields) {
		const held = parsed[field.key];
		if (isEmpty(held)) {
			if (field.required) return { failure: said(EMPTY_FIELD, field.key) };
			continue;
		}
		const written = held instanceof Date ? held.toISOString() : String(held);
		if (field.type === "datetime" && Number.isNaN(Date.parse(written)))
			return { failure: said(BAD_DATETIME, field.key) };
		if (field.type === "boolean" && !BOOLEAN_WORDS.has(written)) return { failure: said(BAD_BOOLEAN, field.key) };
		item[field.key] = field.type === "boolean" ? written === "true" : written;
	}
	return { item };
}

const isMap = (held) => Boolean(held) && typeof held === "object" && !Array.isArray(held);

const isEmpty = (held) => held === undefined || held === null || String(held).trim() === "";

function noteOf(field) {
	return field.required ? ` # ${field.type ?? "text"}` : ` # optional, ${field.type ?? "text"}`;
}
