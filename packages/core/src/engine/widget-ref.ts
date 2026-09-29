const GENERATION_AT_END = /@([0-9a-f]{7,40}|\d+)$/;

type HeldRef = string | null | undefined;

export function widgetKeyOf(ref: HeldRef): string {
	const text = String(ref ?? "");
	const found = generationMatch(text);
	return found ? text.slice(0, found.index) : text;
}

export function generationOf(ref: HeldRef): string | null {
	return generationMatch(ref)?.[1] ?? null;
}

export function widgetRef(key: string, generation: HeldRef): string {
	return generation ? `${key}@${generation}` : key;
}

function generationMatch(ref: HeldRef): RegExpExecArray | null {
	const found = GENERATION_AT_END.exec(String(ref ?? ""));
	return found && found.index > 0 ? found : null;
}
