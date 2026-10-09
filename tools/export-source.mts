export const SOURCE_CONDITION = "source";

export function fieldOf(held: unknown, key: string): unknown {
	return typeof held === "object" && held !== null ? Reflect.get(held, key) : undefined;
}

export function sourceOfExport(target: unknown): string | null {
	if (typeof target === "string") return target;
	const source = fieldOf(target, SOURCE_CONDITION);
	return typeof source === "string" ? source : null;
}
