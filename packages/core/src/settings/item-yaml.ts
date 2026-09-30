import { parse as parseYaml } from "yaml";
import type { DescribedField } from "../gateway/props.js";

const BAD_YAML = "That is not valid YAML, so nothing was kept.";

const NOT_A_MAP = "An item is a set of fields, so this has to be a YAML map.";

const UNKNOWN_FIELD = 'The field "{field}" is not one this list keeps.';

const EMPTY_FIELD = 'The field "{field}" is required, so it cannot be left empty.';

const BAD_DATETIME = 'The field "{field}" must be a date and time, like 2026-09-01T09:00:00Z.';

const BAD_BOOLEAN = 'The field "{field}" must be true or false.';

const BOOLEAN_WORDS = new Set(["true", "false"]);

const UNPARSED = Symbol("unparsed");

export type ItemField = Pick<DescribedField, "key" | "required"> & { readonly type?: string | undefined };

export type Item = Readonly<Record<string, unknown>>;

export type ReadItem = { readonly item: Item; readonly failure?: undefined } | { readonly failure: string };

type HeldMap = Readonly<Record<string, unknown>>;

export const fillSentence = (sentence: string, field: string | number, note?: string): string =>
	sentence.replace("{field}", String(field)).replace("{note}", String(note));

export function yamlOf(fields: readonly ItemField[], item: Item): string {
	return fields
		.map((field) => {
			const held = item[field.key];
			const empty = field.required ? '""' : "null";
			const spelled = field.type === "boolean" ? String(held) : JSON.stringify(String(held));
			return `${field.key}: ${isEmpty(held) ? empty : spelled}${noteOf(field)}`;
		})
		.join("\n");
}

export function readYaml(text: unknown, fields: readonly ItemField[]): ReadItem {
	const parsed = parsedYaml(text);
	if (parsed === UNPARSED) return { failure: BAD_YAML };
	if (!isMap(parsed)) return { failure: NOT_A_MAP };
	const known = new Set(fields.map((field) => field.key));
	const stray = Object.keys(parsed).find((name) => !known.has(name));
	if (stray) return { failure: fillSentence(UNKNOWN_FIELD, stray) };
	const item: Record<string, unknown> = {};
	for (const field of fields) {
		const held = parsed[field.key];
		if (isEmpty(held)) {
			if (field.required) return { failure: fillSentence(EMPTY_FIELD, field.key) };
			continue;
		}
		const written = held instanceof Date ? held.toISOString() : String(held);
		const refusal = refusalOf(field, written);
		if (refusal) return { failure: refusal };
		item[field.key] = field.type === "boolean" ? written === "true" : written;
	}
	return { item };
}

function parsedYaml(text: unknown): unknown {
	try {
		return parseYaml(String(text ?? "")) ?? {};
	} catch {
		return UNPARSED;
	}
}

function refusalOf(field: ItemField, written: string): string | null {
	if (field.type === "datetime" && Number.isNaN(Date.parse(written))) return fillSentence(BAD_DATETIME, field.key);
	if (field.type === "boolean" && !BOOLEAN_WORDS.has(written)) return fillSentence(BAD_BOOLEAN, field.key);
	return null;
}

const isMap = (held: unknown): held is HeldMap => Boolean(held) && typeof held === "object" && !Array.isArray(held);

const isEmpty = (held: unknown): boolean => held === undefined || held === null || String(held).trim() === "";

function noteOf(field: ItemField): string {
	return field.required ? ` # ${field.type ?? "text"}` : ` # optional, ${field.type ?? "text"}`;
}
