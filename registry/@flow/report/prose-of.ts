import type { ProseSource } from "./types";

export const trimmed = (held: unknown) => (typeof held === "string" ? held.trim() : "");

export function proseOf(source: ProseSource) {
	if (typeof source === "string") return source.trim();
	return trimmed(source?.content) || trimmed(source?.body);
}
