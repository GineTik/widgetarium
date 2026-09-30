export interface ReferenceDraft {
	readonly tile: string | null;
	readonly needle: string;
}

export interface OfferedBox {
	readonly tile: string;
	readonly prop: string;
}

// TRADE-OFF: the braces are how a reference is TYPED; what lands in the note is still `{ ref }`, so an older board reads unchanged
export function referenceIn(draft: unknown): ReferenceDraft | null {
	const text = String(draft ?? "").trim();
	if (!text.startsWith("{{")) return null;
	const inner = text.replace(/^\{\{/, "").replace(/\}\}$/, "");
	const dot = inner.indexOf(".");
	if (dot < 0) return { tile: null, needle: inner.trim() };
	return { tile: inner.slice(0, dot).trim(), needle: inner.slice(dot + 1).trim() };
}

export const referenceText = (tile: string, prop?: string | null): string => `{{${tile}.${prop ?? ""}}}`;

export function boxNamed<Offered extends OfferedBox>(
	offered: readonly Offered[],
	said: ReferenceDraft | null | undefined,
): Offered | null {
	if (!said?.tile) return null;
	return offered.find((entry) => entry.tile === said.tile && entry.prop === said.needle) ?? null;
}

export const matchesNeedle = (name: unknown, needle: unknown): boolean =>
	String(name ?? "")
		.toLowerCase()
		.includes(String(needle ?? "").toLowerCase());

export function widgetsOffering<Offered extends Pick<OfferedBox, "tile">>(offered: readonly Offered[]): Offered[] {
	return [...new Map(offered.map((entry) => [entry.tile, entry] as const)).values()];
}
