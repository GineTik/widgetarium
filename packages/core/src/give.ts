export const GIVE_PX = 22;

export function holdBetween(wanted: number, low: number, high: number, give?: boolean): number {
	if (give) return resist(wanted, low, high);
	return Math.min(Math.max(wanted, low), high);
}

function resist(wanted: number, low: number, high: number): number {
	if (wanted < low) return low - GIVE_PX * (1 - GIVE_PX / (GIVE_PX + (low - wanted)));
	if (wanted > high) return high + GIVE_PX * (1 - GIVE_PX / (GIVE_PX + (wanted - high)));
	return wanted;
}
