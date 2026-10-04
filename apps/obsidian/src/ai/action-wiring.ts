import { isObject } from "@widgetarium/core/engine/is-object.js";

export const FEATURE_ACTIONS = ["create", "update", "remove"] as const;

export type FeatureAction = (typeof FEATURE_ACTIONS)[number];

export interface PlacedTile {
	readonly tile: unknown;
	readonly card: unknown;
}

interface CommandWrite {
	readonly owner: string;
	readonly prop: string;
	readonly action: FeatureAction;
	readonly target: string;
	readonly allows: readonly string[];
	readonly isSwitchedOn: boolean;
	readonly line: string;
}

const ACTION_OF_SOURCE: Readonly<Record<string, FeatureAction>> = {
	"@core/rows-create": "create",
	"@core/rows-update": "update",
	"@core/rows-remove": "remove",
};

const NO_COMMAND = "nothing on this page can {action} {widget}'s records: place a widget whose command does";
const NOT_ALLOWED =
	"{owner}'s {prop} would {action} {target}, and {target} on this page allows {allows}: add {action} to its allow";
const ONLY_READING = "only reading";
const SWITCHED_OFF =
	"{owner}'s {prop} writes the vault and is switched off on this page: give it its own binding — {line}";
const VAULT_IMPLEMENTATION = /^@obsidian\//;

export function actionProblemsOf(
	widget: string,
	feature: PlacedTile,
	others: readonly PlacedTile[],
	actions: readonly FeatureAction[],
): string[] {
	const writes = [feature, ...others].flatMap((placed) => commandWritesOf(placed, feature.tile));
	return actions.flatMap((action) => actionProblems(widget, writes, action));
}

function actionProblems(widget: string, writes: readonly CommandWrite[], action: FeatureAction): string[] {
	const able = writes.filter((write) => write.action === action);
	if (able.length === 0) return [NO_COMMAND.replace("{widget}", widget).replaceAll("{action}", action)];
	const allowed = able.filter((write) => write.allows.includes(action));
	if (allowed.some((write) => write.isSwitchedOn)) return [];
	const [first] = allowed.length > 0 ? allowed : able;
	if (!first) return [];
	return [allowed.length > 0 ? switchedOffSaid(first) : notAllowedSaid(first)];
}

function notAllowedSaid(write: CommandWrite): string {
	return NOT_ALLOWED.replace("{owner}", write.owner)
		.replace("{prop}", write.prop)
		.replaceAll("{action}", write.action)
		.replaceAll("{target}", write.target)
		.replace("{allows}", write.allows.length > 0 ? write.allows.join(", ") : ONLY_READING);
}

function switchedOffSaid(write: CommandWrite): string {
	return SWITCHED_OFF.replace("{owner}", write.owner).replace("{prop}", write.prop).replace("{line}", write.line);
}

function commandWritesOf({ card, tile }: PlacedTile, rowsTile: unknown): CommandWrite[] {
	const bound = objectAt(tile, "props");
	const props = new Set([
		...Object.keys(objectAt(card, "props")),
		...Object.keys(objectAt(card, "commands")),
		...Object.keys(bound),
	]);
	return [...props].flatMap((prop) => {
		const source =
			isObject(bound[prop]) && "implementation" in bound[prop] ? bound[prop] : declaredSourceOf(card, prop);
		const action = ACTION_OF_SOURCE[String(source["implementation"])];
		const target = targetIn(objectAt(source, "fields")["target"], tile, rowsTile);
		if (!action || target === null) return [];
		return [writeOf({ tile, prop, action, target, implementation: String(source["implementation"]) }, rowsTile)];
	});
}

interface WriteAsked {
	readonly tile: unknown;
	readonly prop: string;
	readonly action: FeatureAction;
	readonly target: string;
	readonly implementation: string;
}

function writeOf({ tile, prop, action, target, implementation }: WriteAsked, rowsTile: unknown): CommandWrite {
	const targetBinding = objectAt(objectAt(rowsTile, "props"), target);
	const allow = targetBinding["allow"];
	const own = objectAt(objectAt(tile, "props"), prop)["allow"];
	const isVault = VAULT_IMPLEMENTATION.test(String(targetBinding["implementation"]));
	return {
		owner: textAt(tile, "widget") || tileIdOf(tile),
		prop,
		action,
		target,
		allows: Array.isArray(allow) ? allow.map(String) : [],
		isSwitchedOn: !isVault || (Array.isArray(own) && own.includes("run")),
		line: `${prop}: { implementation: "${implementation}", fields: { target: ${tileIdOf(rowsTile)}/${target} }, allow: [run] }`,
	};
}

function declaredSourceOf(card: unknown, prop: string): Readonly<Record<string, unknown>> {
	const declared = objectAt(objectAt(card, "props"), prop);
	return isObject(declared["source"])
		? declared["source"]
		: objectAt(objectAt(objectAt(card, "commands"), prop), "source");
}

function targetIn(named: unknown, tile: unknown, rowsTile: unknown): string | null {
	if (typeof named !== "string") return null;
	const slash = named.indexOf("/");
	if (slash < 0) return tile === rowsTile ? named : null;
	return named.slice(0, slash) === tileIdOf(rowsTile) ? named.slice(slash + 1) : null;
}

function tileIdOf(tile: unknown): string {
	return textAt(tile, "id") || "<tile>";
}

function textAt(held: unknown, key: string): string {
	return isObject(held) && typeof held[key] === "string" ? held[key] : "";
}

function objectAt(held: unknown, key: string): Readonly<Record<string, unknown>> {
	const value = isObject(held) ? held[key] : undefined;
	return isObject(value) ? value : {};
}
