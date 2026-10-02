import { createElement as h } from "react";
import type { FormEvent, ReactElement } from "react";
import { z } from "zod";
import { Field, Switch } from "@widgetarium/kit";
import { TARGET_FIELD } from "../surface/command-binding.js";
import { offeredLabelOf } from "./offered-boxes.js";
import type { OfferedEntry } from "./offered-boxes.js";
import { pickRow } from "./settings-rows.js";

type Write = (next: Record<string, unknown>) => void;

type FieldKind =
	| { readonly kind: "text" }
	| { readonly kind: "number" }
	| { readonly kind: "boolean" }
	| { readonly kind: "choice"; readonly options: readonly string[] }
	| { readonly kind: "ref"; readonly pick: string };

interface FieldAsk {
	readonly key: string;
	readonly field: FieldKind;
	readonly held: object;
	readonly write: Write;
	readonly offered: readonly OfferedEntry[];
}

export function packFieldRows(
	schema: z.ZodType,
	held: object,
	write: Write,
	offered: readonly OfferedEntry[] = [],
): ReactElement[] {
	if (!(schema instanceof z.ZodObject)) return [];
	const shape: Record<string, unknown> = schema.shape;
	return Object.keys(shape).flatMap((key) => {
		const field = key === TARGET_FIELD ? null : kindOf(shape[key]);
		if (!field) return [];
		const label = h("p", { className: "wg-set-pop-note", key: `${key}:label` }, labelOf(key));
		return [label, ...controlsOf({ key, field, held, write, offered })];
	});
}

export function hasPackFields(schema: z.ZodType): boolean {
	return schema instanceof z.ZodObject && Object.keys(schema.shape).some((key) => key !== TARGET_FIELD);
}

function controlsOf({ key, field, held, write, offered }: FieldAsk): ReactElement[] {
	const value: unknown = Reflect.get(held, key);
	const set = (next: unknown): void => write({ ...held, [key]: next });
	if (field.kind === "boolean")
		return [h(Switch, { key, checked: value === true, label: labelOf(key), onChange: (on: boolean) => set(on) })];
	if (field.kind === "choice")
		return field.options.map((option) => pickRow(`${key}:${option}`, option, () => set(option), value === option));
	if (field.kind === "ref")
		return offered
			.filter((entry) => entry.kind === field.pick)
			.map((entry) => pickRow(`${key}:${entry.ref}`, offeredLabelOf(entry), () => set(entry.ref), value === entry.ref));
	const onInput = (event: FormEvent): void => {
		const typed = typedValueOf(event.target);
		set(field.kind === "number" && typed !== "" ? Number(typed) : typed);
	};
	const shown = typeof value === "string" || typeof value === "number" ? String(value) : "";
	return [h(Field, { block: true, key, value: shown, placeholder: labelOf(key), onInput })];
}

function kindOf(field: unknown): FieldKind | null {
	if (field instanceof z.ZodOptional || field instanceof z.ZodDefault) return kindOf(field.unwrap());
	if (!(field instanceof z.ZodType)) return null;
	const picked: unknown = field.meta()?.["pick"];
	if (typeof picked === "string") return { kind: "ref", pick: picked };
	if (field instanceof z.ZodString) return { kind: "text" };
	if (field instanceof z.ZodNumber) return { kind: "number" };
	if (field instanceof z.ZodBoolean) return { kind: "boolean" };
	if (field instanceof z.ZodEnum) return { kind: "choice", options: field.options.map(String) };
	return null;
}

function labelOf(key: string): string {
	const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
	return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

function typedValueOf(target: EventTarget): string {
	return "value" in target && typeof target.value === "string" ? target.value : "";
}
