export type OpenedOverlay = "none" | "floating" | "sheet" | "drawer" | "alert" | "toast";

export function openedFromHash(hash: string): OpenedOverlay {
	const word = hash.replace(/^#open=/, "");
	const known: readonly OpenedOverlay[] = ["floating", "sheet", "drawer", "alert", "toast"];
	return known.find((name) => name === word) ?? "none";
}
