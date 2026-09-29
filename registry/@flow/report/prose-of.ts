import type { ProseSource } from "./types";

export const trimText = (held: unknown) => (typeof held === "string" ? held.trim() : "");

export function proseOf(source: ProseSource) {
	if (typeof source === "string") return source.trim();
	return trimText(source?.content) || trimText(source?.body);
}
