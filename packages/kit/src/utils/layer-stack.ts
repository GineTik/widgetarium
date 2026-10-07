const OPEN_LAYERS: symbol[] = [];

export function openLayer(): symbol {
	const layer = Symbol("overlay layer");
	OPEN_LAYERS.push(layer);
	return layer;
}

export function closeLayer(layer: symbol): void {
	const at = OPEN_LAYERS.indexOf(layer);
	if (at !== -1) OPEN_LAYERS.splice(at, 1);
}

export function isTopLayer(layer: symbol): boolean {
	return OPEN_LAYERS.at(-1) === layer;
}

export function openLayerCount(): number {
	return OPEN_LAYERS.length;
}
