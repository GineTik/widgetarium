export function toTrimmedList(value: unknown): string[] {
	if (Array.isArray(value)) return value.map((entry) => String(entry).trim()).filter(Boolean);
	return String(value ?? "")
		.split(",")
		.map((entry) => entry.trim())
		.filter(Boolean);
}

export function keyFor(props: Record<string, unknown> | undefined, name: string): string {
	const wanted = String(name ?? "").toLowerCase();
	return Object.keys(props ?? {}).find((key) => key.toLowerCase() === wanted) ?? name;
}

export function isUnset(value: unknown): boolean {
	if (value === undefined || value === null || value === "") return true;
	return Array.isArray(value) && value.length === 0;
}
