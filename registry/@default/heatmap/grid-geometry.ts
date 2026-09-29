export const WEEK = 7;
export const CELL = 10;
export const GAP = 3;
export const PITCH = CELL + GAP;

export function gridWidthOf(days: (string | null)[]): number {
	return (days.length / WEEK) * PITCH - GAP;
}
