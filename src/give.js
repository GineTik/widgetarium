export const GIVE_PX = 22;

export function resist(wanted, low, high) {
	if (wanted < low) return low - GIVE_PX * (1 - GIVE_PX / (GIVE_PX + (low - wanted)));
	if (wanted > high) return high + GIVE_PX * (1 - GIVE_PX / (GIVE_PX + (wanted - high)));
	return wanted;
}

export function heldBetween(wanted, low, high, give) {
	if (give) return resist(wanted, low, high);
	return Math.min(Math.max(wanted, low), high);
}
