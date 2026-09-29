export const COUNT = "{count}";

export function saidOf(value: unknown): string {
	return String(value ?? "").trim();
}

export function countOf(value: unknown): number | null {
	if (value === undefined || value === null || value === "") return null;
	const number = Number(value);
	if (!Number.isFinite(number)) return null;
	return Math.max(0, Math.round(number));
}
