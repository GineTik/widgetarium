// WHICH BOARD IS THIS. Obsidian hands us a NEW element for every block on every re-render of
// the note, so the element cannot be the identity: keying by it rebuilt the whole board each
// time (the flicker), left the old mounts alive with their ResizeObservers (the shaking), and
// let each fresh mount read the file from before our own pending write (a collapsed panel
// springing back open).
//
// getSectionInfo gives the block's line — the real identity — but returns null while the
// editor is mid-render, which is exactly when our own write lands, and on a cold start too.
//
// Two fallbacks were tried and both failed for the same reason: they were not STABLE. "The
// note's only mount" has nothing to find on the first render, and a per-pass counter grows
// whenever renders arrive faster than the microtask queue drains — ~0, ~1, ~2, a new mount
// every time. So the fallback names no position at all: it reuses the note's existing board
// if it has exactly one, and otherwise assumes the first, which is the same answer twice in
// a row and therefore stable. A note whose board is really the second block migrates once,
// when the editor can finally say so, and then stays.
export function mountKeyFor(keys, sourcePath, blockIndex) {
	if (blockIndex >= 0) return `${sourcePath}#${blockIndex}`;

	const prefix = `${sourcePath}#`;
	const owned = [...keys].filter((key) => typeof key === "string" && key.startsWith(prefix));
	return owned.length === 1 ? owned[0] : `${prefix}0`;
}
