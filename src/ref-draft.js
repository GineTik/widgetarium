// TRADE-OFF: the braces are how a reference is TYPED; what lands in the note is still `{ ref }`, so an older board reads unchanged
export function referenceIn(draft) {
	const text = String(draft ?? "").trim();
	if (!text.startsWith("{{")) return null;
	const inner = text.replace(/^\{\{/, "").replace(/\}\}$/, "");
	const dot = inner.indexOf(".");
	if (dot < 0) return { tile: null, needle: inner.trim() };
	return { tile: inner.slice(0, dot).trim(), needle: inner.slice(dot + 1).trim() };
}

export const referenceText = (tile, prop) => `{{${tile}.${prop ?? ""}}}`;

export function boxNamed(offered, said) {
	if (!said?.tile) return null;
	return offered.find((entry) => entry.tile === said.tile && entry.prop === said.needle) ?? null;
}

export const matchesNeedle = (name, needle) =>
	String(name ?? "")
		.toLowerCase()
		.includes(String(needle ?? "").toLowerCase());

export function widgetsOffering(offered) {
	return [...new Map(offered.map((entry) => [entry.tile, entry])).values()];
}
