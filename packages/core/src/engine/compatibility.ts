import { isObject } from "./is-object.js";
import type { Fields } from "./catalogue-index.js";

export type PropSpecs = Readonly<Record<string, Fields>>;

export type PropChange =
	| { readonly prop: string; readonly kind: "removed" | "reshaped"; readonly breaks: true }
	| { readonly prop: string; readonly kind: "renamed"; readonly to: string; readonly breaks: false }
	| { readonly prop: string; readonly kind: "default"; readonly breaks: true; readonly implicit: true }
	| { readonly prop: string; readonly kind: "writes"; readonly breaks: false; readonly verbs: readonly unknown[] }
	| { readonly prop: string; readonly kind: "added"; readonly breaks: boolean };

export interface MigrationStep {
	readonly from?: unknown;
	run(props: Fields): Fields;
}

export interface Compatibility {
	readonly isCompatible: boolean;
	readonly changes: readonly PropChange[];
	readonly breaking: readonly PropChange[];
	readonly canMoveTiles: boolean;
	readonly migration: MigrationStep | null;
}

export interface PropsHolder {
	readonly props?: unknown;
	readonly migrate?: unknown;
}

type Held<Shape> = Shape | null | undefined;

const SAME_SHAPE_KEYS: readonly string[] = ["kind", "control", "source", "shape"];

export function propChanges(fromProps: unknown = {}, toProps: unknown = {}): PropChange[] {
	const from = specsIn(fromProps);
	const to = specsIn(toProps);
	const changed = Object.entries(from)
		.map(([name, spec]) => changeOf(name, spec, to))
		.filter((change): change is PropChange => change !== null);
	return [...changed, ...addedProps(from, to)];
}

export function migrationFrom(manifest: Held<PropsHolder>, fromProps: unknown): MigrationStep | null {
	const steps: readonly unknown[] = Array.isArray(manifest?.migrate) ? manifest.migrate : [];
	return steps.filter(isMigrationStep).find((step) => sameProps(step.from, fromProps)) ?? null;
}

export function compatibility(from: Held<PropsHolder>, to: Held<PropsHolder>): Compatibility {
	const fromProps = from?.props ?? {};
	const changes = propChanges(fromProps, to?.props ?? {});
	const breaking = changes.filter((change) => change.breaks);
	const migration = migrationFrom(to, fromProps);
	return {
		isCompatible: breaking.length === 0,
		changes,
		breaking,
		canMoveTiles: tilesCanMove(breaking, migration),
		migration,
	};
}

export function moveTileProps(props: Held<Fields>, verdict: Compatibility): Fields {
	const renamed = renameConfig(props ?? {}, verdict.changes);
	if (!verdict.migration) return renamed;
	return { ...renamed, ...verdict.migration.run(renamed) };
}

function isMigrationStep(step: unknown): step is MigrationStep {
	return isObject(step) && typeof step["run"] === "function";
}

function specsIn(props: unknown): PropSpecs {
	if (!isObject(props)) return {};
	return Object.fromEntries(Object.entries(props).map(([name, spec]) => [name, isObject(spec) ? spec : {}]));
}

function shapeOf(spec: Held<Fields>): string {
	return JSON.stringify(SAME_SHAPE_KEYS.map((key) => spec?.[key] ?? null));
}

function namesOf(spec: Fields, name: string): unknown[] {
	const aka = spec["aka"];
	return [name, ...(Array.isArray(aka) ? aka : [])];
}

function renamedTo(props: PropSpecs, name: string): string | null {
	return Object.entries(props).find(([now, spec]) => now !== name && namesOf(spec, now).includes(name))?.[0] ?? null;
}

function sameDefault(from: Fields, to: Fields): boolean {
	return JSON.stringify(from["default"] ?? null) === JSON.stringify(to["default"] ?? null);
}

function missingChangeOf(name: string, from: Fields, props: PropSpecs): PropChange {
	const renamed = renamedTo(props, name);
	if (!renamed) return { prop: name, kind: "removed", breaks: true };
	if (shapeOf(from) !== shapeOf(props[renamed])) return { prop: name, kind: "reshaped", breaks: true };
	return { prop: name, kind: "renamed", to: renamed, breaks: false };
}

function changeOf(name: string, from: Fields, props: PropSpecs): PropChange | null {
	const to = props[name];
	if (!to) return missingChangeOf(name, from, props);
	if (shapeOf(from) !== shapeOf(to)) return { prop: name, kind: "reshaped", breaks: true };
	if (!sameDefault(from, to)) return { prop: name, kind: "default", breaks: true, implicit: true };
	const had = listIn(from["writes"]);
	const added = listIn(to["writes"]).filter((verb) => !had.includes(verb));
	return added.length > 0 ? { prop: name, kind: "writes", breaks: false, verbs: added } : null;
}

function listIn(held: unknown): readonly unknown[] {
	return Array.isArray(held) ? held : [];
}

function addedProps(fromProps: PropSpecs, toProps: PropSpecs): PropChange[] {
	return Object.entries(toProps)
		.filter(
			([name, spec]) =>
				!fromProps[name] && !listIn(spec["aka"]).some((old) => typeof old === "string" && fromProps[old]),
		)
		.map(([name, spec]) => ({
			prop: name,
			kind: "added",
			breaks: !spec["default"] && spec["control"] !== "pick" && spec["control"] !== "row",
		}));
}

function sameProps(from: unknown, props: unknown): boolean {
	const fromSpecs = specsIn(from);
	const heldSpecs = specsIn(props);
	return (
		Object.keys(fromSpecs).length === Object.keys(heldSpecs).length &&
		Object.entries(fromSpecs).every(([name, spec]) => {
			const held = heldSpecs[name];
			return Boolean(held) && shapeOf(spec) === shapeOf(held);
		})
	);
}

function tilesCanMove(breaking: readonly PropChange[], migration: MigrationStep | null): boolean {
	return migration !== null || breaking.every((change) => change.kind === "default");
}

function renameConfig(props: Fields, changes: readonly PropChange[]): Fields {
	const moved: Record<string, unknown> = { ...props };
	for (const change of changes) {
		if (change.kind !== "renamed" || moved[change.prop] === undefined) continue;
		moved[change.to] = moved[change.prop];
		delete moved[change.prop];
	}
	return moved;
}
