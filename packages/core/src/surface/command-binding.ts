import { z } from "zod";

import { refOf } from "../gateway/refs.js";
import { isObject } from "../engine/is-object.js";
import { PropRefSchema } from "../engine/prop-ref.js";
import type { Tile } from "../model.js";

export const TARGET_FIELD = "target";

export const CONSOLE_LOG = "@core/console-log";

export type CommandTarget = "collection" | "value";

export interface HostCommandKind {
	readonly verb: string;
	readonly target: CommandTarget | null;
	readonly title: string;
	readonly said: string;
}

export const HOST_COMMAND_KINDS: Readonly<Record<string, HostCommandKind>> = {
	[CONSOLE_LOG]: {
		verb: "run",
		target: null,
		title: "Print to the console",
		said: "Prints what the widget sends to the developer console and changes nothing.",
	},
	"@core/typed-rows-create": {
		verb: "create",
		target: "collection",
		title: "Add a row",
		said: "Adds a row to a typed list on this board.",
	},
	"@core/typed-rows-update": {
		verb: "update",
		target: "collection",
		title: "Change a row",
		said: "Rewrites a row of a typed list on this board.",
	},
	"@core/typed-rows-remove": {
		verb: "remove",
		target: "collection",
		title: "Remove a row",
		said: "Drops a row from a typed list on this board.",
	},
	"@core/typed-value-set": {
		verb: "update",
		target: "value",
		title: "Set a value",
		said: "Sets a value typed on this board.",
	},
};

export const CommandBindingSchema = z.object({
	implementation: z.string().optional(),
	fields: z.record(z.string(), z.unknown()).optional(),
	allow: z.array(z.string()).optional(),
});

export type CommandBinding = z.infer<typeof CommandBindingSchema>;

const CommandSpecSchema = z.object({
	label: z.string(),
	hint: z.string().optional(),
	source: z.object({ implementation: z.string(), fields: z.record(z.string(), z.unknown()).optional() }).optional(),
});

export type ParsedCommandSpec = z.infer<typeof CommandSpecSchema>;

const SWITCHED_OFF_UNTIL_REPAIRED: CommandBinding = { allow: [] };

export function commandSpecsOf(held: unknown): Readonly<Record<string, ParsedCommandSpec>> {
	if (!isObject(held)) return {};
	const parsed = Object.entries(held).map(([name, spec]) => [name, CommandSpecSchema.safeParse(spec)] as const);
	return Object.fromEntries(parsed.flatMap(([name, spec]) => (spec.success ? [[name, spec.data] as const] : [])));
}

export function commandBindingOf(tile: Tile, name: string, spec: ParsedCommandSpec | undefined): CommandBinding {
	const own = tile.props?.[name];
	if (own !== undefined) {
		const parsed = CommandBindingSchema.safeParse(own);
		return parsed.success ? parsed.data : SWITCHED_OFF_UNTIL_REPAIRED;
	}
	if (!spec?.source) return { implementation: CONSOLE_LOG };
	return { implementation: spec.source.implementation, fields: siblingRefsOf(tile.id, spec.source.fields ?? {}) };
}

export function isRunAllowed(binding: CommandBinding): boolean {
	return binding.allow === undefined || binding.allow.includes("run");
}

export function withRunAllowed(binding: CommandBinding, isOn: boolean): CommandBinding {
	return { ...binding, allow: isOn ? ["run"] : [] };
}

export function targetOf(binding: CommandBinding): string | null {
	const parsed = PropRefSchema.safeParse(binding.fields?.[TARGET_FIELD]);
	return parsed.success ? parsed.data : null;
}

function siblingRefsOf(tileId: string, fields: Readonly<Record<string, unknown>>): Record<string, unknown> {
	return Object.fromEntries(
		Object.entries(fields).map(([field, held]) => [
			field,
			typeof held === "string" && !held.includes("/") ? refOf(tileId, held) : held,
		]),
	);
}
