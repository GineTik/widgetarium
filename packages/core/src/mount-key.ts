// TRADE-OFF: with no block line yet, reuse the note's only board or assume the first; a counter or a position is not stable across re-renders.
export function mountKeyFor(keys: Iterable<unknown>, sourcePath: string, blockIndex: number): string {
	if (blockIndex >= 0) return `${sourcePath}#${blockIndex}`;

	const prefix = `${sourcePath}#`;
	const owned = [...keys].filter((key): key is string => typeof key === "string" && key.startsWith(prefix));
	const [onlyOwned] = owned;
	return owned.length === 1 && onlyOwned !== undefined ? onlyOwned : `${prefix}0`;
}
