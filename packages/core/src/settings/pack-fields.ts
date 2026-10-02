import { createElement as h } from "react";
import type { FormEvent, ReactElement } from "react";
import { z } from "zod";
import { Field } from "@widgetarium/kit";
import { TARGET_FIELD } from "../surface/command-binding.js";

export function packFieldRows(
	schema: z.ZodType,
	held: object,
	write: (next: Record<string, unknown>) => void,
): ReactElement[] {
	if (!(schema instanceof z.ZodObject)) return [];
	const shape: Record<string, unknown> = schema.shape;
	return Object.keys(shape)
		.filter((key) => key !== TARGET_FIELD && isText(shape[key]))
		.flatMap((key) => [
			h("p", { className: "wg-set-pop-note", key: `${key}:label` }, labelOf(key)),
			h(Field, {
				block: true,
				key,
				value: textIn(Reflect.get(held, key)),
				placeholder: labelOf(key),
				onInput: (event: FormEvent) => write({ ...held, [key]: typedValueOf(event.target) }),
			}),
		]);
}

function isText(field: unknown): boolean {
	if (field instanceof z.ZodOptional || field instanceof z.ZodDefault) return isText(field.unwrap());
	return field instanceof z.ZodString;
}

function textIn(held: unknown): string {
	return typeof held === "string" ? held : "";
}

function labelOf(key: string): string {
	const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
	return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

function typedValueOf(target: EventTarget): string {
	return "value" in target && typeof target.value === "string" ? target.value : "";
}
