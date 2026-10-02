import { useMemo } from "react";
import type { CanResult } from "../gateway/contract";
import type { GatewayRefs } from "../gateway/refs.js";
import { isObject } from "../engine/is-object.js";
import { PropRefSchema } from "../engine/prop-ref.js";
import type { EngineManifest } from "../engine/catalogue-index.js";
import type { Tile } from "../model.js";

export interface HostCommand {
	run(input: unknown): Promise<void>;
	can(): CanResult;
}

type RowWrite = (verbs: Readonly<Record<string, unknown>>, input: unknown) => Promise<unknown>;

const NOT_ALLOWED = '"{name}" is switched off for this tile';
const UNKNOWN_IMPLEMENTATION = '"{name}" names {implementation}, which this host does not run';
const NOTHING_NAMED = '"{name}" names nothing to change: pick it in the settings window';
const ROWS_GONE = '"{name}" changes {ref}, which is no longer on this board';
const ROWS_CANNOT = "{ref} cannot {verb}";

export const TYPED_ROW_COMMANDS: Readonly<Record<string, { readonly verb: string; readonly write: RowWrite }>> = {
	"@core/typed-rows-create": { verb: "create", write: createRow },
	"@core/typed-rows-update": { verb: "update", write: updateRow },
	"@core/typed-rows-remove": { verb: "remove", write: removeRow },
};

export const TYPED_VALUE_COMMANDS: Readonly<Record<string, { readonly verb: string; readonly write: RowWrite }>> = {
	"@core/typed-value-set": { verb: "update", write: (verbs, input) => call(verbs, "update", input) },
};

const HOST_COMMANDS = { ...TYPED_ROW_COMMANDS, ...TYPED_VALUE_COMMANDS };

export const TARGET_FIELD = "target";

export function useHostCommands(manifest: EngineManifest, tile: Tile, refs: GatewayRefs): Record<string, HostCommand> {
	const declared = isObject(manifest["commands"]) ? manifest["commands"] : {};
	const commands = Object.keys(declared);
	return useMemo(
		() =>
			Object.fromEntries(
				commands
					.map((name) => [name, hostCommandOf(name, bindingOf(tile, name, declared[name]), refs)] as const)
					.filter((entry): entry is readonly [string, HostCommand] => entry[1] !== null),
			),
		[tile.props, refs, commands.join("\u0000")],
	);
}

function bindingOf(tile: Tile, name: string, spec: unknown): unknown {
	const own = tile.props?.[name];
	if (own !== undefined) return own;
	const source = isObject(spec) ? spec["source"] : undefined;
	if (!isObject(source)) return undefined;
	const fields = isObject(source["fields"]) ? source["fields"] : {};
	const named = Object.entries(fields).map(([field, held]) => [field, siblingRefOf(tile.id, held)] as const);
	return { implementation: source["implementation"], fields: Object.fromEntries(named) };
}

function siblingRefOf(tileId: string, held: unknown): unknown {
	return typeof held === "string" && !held.includes("/") ? `${tileId}/${held}` : held;
}

function hostCommandOf(name: string, binding: unknown, refs: GatewayRefs): HostCommand | null {
	if (!isObject(binding) || typeof binding["implementation"] !== "string") return null;
	const implementation = binding["implementation"];
	const known = HOST_COMMANDS[implementation];
	if (!known)
		return refusedCommand(UNKNOWN_IMPLEMENTATION.replace("{name}", name).replace("{implementation}", implementation));
	if (isSwitchedOff(binding)) return refusedCommand(NOT_ALLOWED.replace("{name}", name));
	const ref = PropRefSchema.safeParse(isObject(binding["fields"]) ? binding["fields"][TARGET_FIELD] : undefined);
	if (!ref.success) return refusedCommand(NOTHING_NAMED.replace("{name}", name));
	const verbsNow = (): Readonly<Record<string, unknown>> | null => {
		const target: unknown = refs.get(ref.data);
		return isObject(target) ? target : null;
	};
	const can = (): CanResult => {
		const verbs = verbsNow();
		if (!verbs) return { can: false, reason: ROWS_GONE.replace("{name}", name).replace("{ref}", ref.data) };
		const verb = verbs[known.verb];
		if (typeof verb !== "function") return { can: false, reason: cannot(ref.data, known.verb) };
		const asked: unknown = Reflect.get(verb, "can");
		return typeof asked === "function" ? Reflect.apply(asked, verb, []) : { can: true };
	};
	return {
		can,
		async run(input) {
			const decided = can();
			if (!decided.can) throw new Error(decided.reason);
			await known.write(verbsNow() ?? {}, input);
		},
	};
}

function refusedCommand(reason: string): HostCommand {
	return {
		can: () => ({ can: false, reason }),
		run: () => Promise.reject(new Error(reason)),
	};
}

function isSwitchedOff(binding: Readonly<Record<string, unknown>>): boolean {
	const allow = binding["allow"];
	return Array.isArray(allow) && !allow.includes("run");
}

function createRow(verbs: Readonly<Record<string, unknown>>, input: unknown): Promise<unknown> {
	const id = isObject(input) ? input["id"] : undefined;
	if (typeof id === "string" && id !== "") return createUnlessHeld(verbs, input, id);
	return call(verbs, "create", input);
}

async function createUnlessHeld(verbs: Readonly<Record<string, unknown>>, input: unknown, id: string) {
	const listed: unknown = await call(verbs, "list", { where: [{ prop: "id", op: "is", value: id }], limit: 1 });
	const rows = isObject(listed) && Array.isArray(listed["rows"]) ? listed["rows"] : [];
	if (rows.length > 0) return null;
	return call(verbs, "create", input);
}

function updateRow(verbs: Readonly<Record<string, unknown>>, input: unknown): Promise<unknown> {
	if (!isObject(input) || typeof input["ref"] !== "string")
		return Promise.reject(new Error(cannot("this row", "update")));
	const { ref, ...data } = input;
	return call(verbs, "update", { ref, data });
}

function removeRow(verbs: Readonly<Record<string, unknown>>, input: unknown): Promise<unknown> {
	const ref = isObject(input) ? input["ref"] : input;
	if (typeof ref !== "string") return Promise.reject(new Error(cannot("this row", "remove")));
	return call(verbs, "remove", ref);
}

function call(verbs: Readonly<Record<string, unknown>>, verb: string, input: unknown): Promise<unknown> {
	const held = verbs[verb];
	if (typeof held !== "function") return Promise.reject(new Error(cannot("the list", verb)));
	return Promise.resolve(Reflect.apply(held, verbs, [input]));
}

function cannot(ref: string, verb: string): string {
	return ROWS_CANNOT.replace("{ref}", ref).replace("{verb}", verb);
}
