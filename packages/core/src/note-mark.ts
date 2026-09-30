const NAMESPACE = "widgetarium";

export type Frontmatter = Readonly<Record<string, unknown>>;

export interface NoteMark {
	readonly kind?: unknown;
	readonly [field: string]: unknown;
}

export function markOf(props: unknown): NoteMark {
	const held = heldMarkOf(props);
	if (typeof held === "string") return held.trim() === "" ? {} : { kind: held.trim() };
	return isMarkObject(held) ? held : {};
}

export function withMark(props: Frontmatter | null | undefined, patch: NoteMark): Frontmatter {
	return { ...(props ?? {}), [NAMESPACE]: { ...markOf(props), ...patch } };
}

function heldMarkOf(props: unknown): unknown {
	return typeof props === "object" && props !== null && NAMESPACE in props ? props[NAMESPACE] : undefined;
}

function isMarkObject(held: unknown): held is NoteMark {
	return typeof held === "object" && held !== null;
}
