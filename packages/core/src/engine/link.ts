export interface ParsedLink {
	readonly rooted: boolean;
	readonly path: string;
}

export function readLink(link: string | null | undefined): ParsedLink | null {
	const text = String(link ?? "").trim();
	if (!text) return null;
	if (!text.startsWith("/")) return { rooted: false, path: text };
	const path = text.slice(1).replace(/\/+$/, "");
	return path ? { rooted: true, path } : null;
}
