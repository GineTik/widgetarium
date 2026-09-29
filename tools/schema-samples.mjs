const PLAIN = {
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

export const SAMPLE_KINDS = ["empty", "minimal", "nulls"];

export function sampleOf(schema, kind) {
	const def = schema?._zod?.def;
	if (!def) return undefined;
	if (def.type === "optional") return kind === "nulls" && isNullable(def.innerType) ? null : undefined;
	if (def.type === "nullable") return kind === "nulls" ? null : sampleOf(def.innerType, kind);
	if (def.type === "default" || def.type === "prefault" || def.type === "catch") return undefined;
	if (def.type === "readonly" || def.type === "nonoptional") return sampleOf(def.innerType, kind);
	if (def.type === "pipe") return sampleOf(def.in, kind);
	if (def.type === "lazy") return sampleOf(def.getter(), kind);
	if (def.type === "object") return objectSample(def.shape, kind);
	if (def.type === "enum") return Object.values(def.entries)[0];
	if (def.type === "literal") return def.values[0];
	if (def.type === "union") return sampleOf(def.options[0], kind);
	return PLAIN[def.type]?.();
}

export function rowsSample(schema, kind) {
	if (kind === "empty") return [];
	const row = sampleOf(schema, kind);
	return row === undefined ? [] : [row, row];
}

function objectSample(shape, kind) {
	const entries = Object.entries(shape).map(([field, held]) => [field, sampleOf(held, kind)]);
	return Object.fromEntries(entries.filter(([, held]) => held !== undefined));
}

function isNullable(schema) {
	const def = schema?._zod?.def;
	if (!def) return false;
	if (def.type === "nullable") return true;
	return def.innerType ? isNullable(def.innerType) : false;
}
