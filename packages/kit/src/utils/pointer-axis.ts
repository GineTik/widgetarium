export interface PointerSpot {
	readonly clientX: number;
	readonly clientY: number;
}

export function pointerAxisOf(event: PointerSpot, isVertical: boolean): number {
	return isVertical ? event.clientY : event.clientX;
}
