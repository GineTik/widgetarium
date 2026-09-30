const FOUND_NOWHERE_OR_TWICE = -1;

export function findLines(
	lines: readonly string[],
	wanted: readonly string[],
	from = 0,
	to: number = lines.length,
): number {
	if (wanted.length === 0) return FOUND_NOWHERE_OR_TWICE;
	const first = Math.max(0, from);
	const last = Math.min(lines.length, to);
	let found = FOUND_NOWHERE_OR_TWICE;
	for (let at = first; at + wanted.length <= last; at += 1) {
		if (wanted.some((line, step) => lines[at + step] !== line)) continue;
		if (found >= 0) return FOUND_NOWHERE_OR_TWICE;
		found = at;
	}
	return found;
}

export function replaceLines<Line>(lines: readonly Line[], at: number, count: number, next: readonly Line[]): Line[] {
	return [...lines.slice(0, at), ...next, ...lines.slice(at + count)];
}
