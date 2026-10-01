export function fieldIn(held: unknown, field: string): unknown {
	if ((typeof held !== "object" && typeof held !== "function") || held === null || !(field in held)) return undefined;
	return Reflect.get(held, field);
}

export function fieldAt(held: unknown, ...path: readonly string[]): unknown {
	return path.reduce<unknown>((at, field) => fieldIn(at, field), held);
}

export function itemsIn(held: unknown): readonly unknown[] {
	return Array.isArray(held) ? held : [];
}

export function textIn(held: unknown, what: string): string {
	if (typeof held !== "string") throw new TypeError(`${what} is not text`);
	return held;
}
