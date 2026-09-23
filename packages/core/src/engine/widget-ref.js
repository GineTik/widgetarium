const GENERATION_AT_END = /@([0-9a-f]{7,40}|\d+)$/;

function generationMatch(ref) {
	const text = String(ref ?? "");
	const found = GENERATION_AT_END.exec(text);
	return found && found.index > 0 ? found : null;
}

export function widgetKeyOf(ref) {
	const text = String(ref ?? "");
	const found = generationMatch(text);
	return found ? text.slice(0, found.index) : text;
}

export function generationOf(ref) {
	return generationMatch(ref)?.[1] ?? null;
}

export function widgetRef(key, generation) {
	return generation ? `${key}@${generation}` : key;
}
