// CONTEXT: a rendered line is not a source line, so a write locates itself by WHAT IT SAYS.
// Found nowhere or found twice both answer -1: guessing which one is the widget's would put
// a person's edit into a paragraph they were not looking at.
export function findLines(lines, wanted, from = 0, to = lines.length) {
	if (wanted.length === 0) return -1;
	const first = Math.max(0, from);
	const last = Math.min(lines.length, to);
	let found = -1;
	for (let at = first; at + wanted.length <= last; at += 1) {
		if (wanted.some((line, step) => lines[at + step] !== line)) continue;
		if (found >= 0) return -1;
		found = at;
	}
	return found;
}

export function replaceLines(lines, at, count, next) {
	return [...lines.slice(0, at), ...next, ...lines.slice(at + count)];
}
