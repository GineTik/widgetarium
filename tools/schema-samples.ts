import { isObject } from "../packages/core/src/engine/is-object.js";

export type SampleKind = "empty" | "minimal" | "nulls";
type SchemaDef = Readonly<Record<string, unknown>>;

const PLAIN: Readonly<Record<string, () => unknown>> = {
	string: () => "",
	number: () => 0,
	int: () => 0,
	bigint: () => 0n,
	boolean: () => false,
	array: () => [],
	record: () => ({}),
	date: () => new Date(0),
	null: () => null,
};

const DEFAULTED = new Set(["default", "prefault", "catch"]);
const WRAPPED = new Set(["readonly", "nonoptional"]);

export const SAMPLE_KINDS: readonly SampleKind[] = ["empty", "minimal", "nulls"];

export function sampleOf(schema: unknown, kind: SampleKind): unknown {
	const def = defOf(schema);
	if (!def) return undefined;
	const type = String(def["type"]);
	if (type === "optional") return kind === "nulls" && isNullable(def["innerType"]) ? null : undefined;
	if (type === "nullable") return kind === "nulls" ? null : sampleOf(def["innerType"], kind);
	if (DEFAULTED.has(type)) return undefined;
	if (WRAPPED.has(type)) return sampleOf(def["innerType"], kind);
	if (type === "pipe") return sampleOf(def["in"], kind);
	if (type === "lazy") return sampleOf(lazyTarget(def["getter"]), kind);
	if (type === "object") return objectSample(def["shape"], kind);
	if (type === "enum") return firstOf(isObject(def["entries"]) ? Object.values(def["entries"]) : []);
	if (type === "literal") return firstOf(def["values"]);
	if (type === "union") return sampleOf(firstOf(def["options"]), kind);
	return PLAIN[type]?.();
}

export function rowsSample(schema: unknown, kind: SampleKind): unknown[] {
	if (kind === "empty") return [];
	const row = sampleOf(schema, kind);
	return row === undefined ? [] : [row, row];
}

function defOf(schema: unknown): SchemaDef | null {
	if (!isObject(schema) || !isObject(schema["_zod"])) return null;
	const def = schema["_zod"]["def"];
	return isObject(def) ? def : null;
}

function lazyTarget(getter: unknown): unknown {
	return typeof getter === "function" ? getter() : undefined;
}

function firstOf(list: unknown): unknown {
	return Array.isArray(list) ? list[0] : undefined;
}

function objectSample(shape: unknown, kind: SampleKind): Record<string, unknown> {
	if (!isObject(shape)) return {};
	const entries = Object.entries(shape).map(([field, held]) => [field, sampleOf(held, kind)] as const);
	return Object.fromEntries(entries.filter(([, held]) => held !== undefined));
}

function isNullable(schema: unknown): boolean {
	const def = defOf(schema);
	if (!def) return false;
	if (def["type"] === "nullable") return true;
	return def["innerType"] ? isNullable(def["innerType"]) : false;
}
