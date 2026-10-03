export function pickedValue(chosen: unknown): string {
	const held = Array.isArray(chosen) ? chosen[0] : chosen;
	return held === undefined || held === null ? "" : String(held);
}
