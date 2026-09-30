export function textIn(held: unknown): string {
	return held === undefined || held === null ? "" : String(held);
}

export function stringIn(held: unknown): string | undefined {
	return typeof held === "string" ? held : undefined;
}
