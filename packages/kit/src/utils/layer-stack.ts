export type EscapeReach = "document" | "within";

export interface OpenLayer {
	readonly holds: (node: Node) => boolean;
	readonly escapeReach: () => EscapeReach;
	readonly mountOrder: number;
}

interface StackedLayer {
	readonly layer: OpenLayer;
	readonly flush: number;
}

const OPEN_LAYERS: StackedLayer[] = [];

let mountCount = 0;

let flushCount = 0;

let isFlushOpen = false;

export function nextMountOrder(): number {
	mountCount += 1;
	return mountCount;
}

export function openLayer(layer: OpenLayer): void {
	const stacked = { layer, flush: currentFlush() };
	const above = OPEN_LAYERS.findIndex((other) => isStackedAbove(other, stacked));
	OPEN_LAYERS.splice(above === -1 ? OPEN_LAYERS.length : above, 0, stacked);
}

export function closeLayer(layer: OpenLayer): void {
	const at = indexOf(layer);
	if (at !== -1) OPEN_LAYERS.splice(at, 1);
}

export function layerTakingEscape(target: Node | null): OpenLayer | undefined {
	return [...OPEN_LAYERS]
		.reverse()
		.map((stacked) => stacked.layer)
		.find((layer) => layer.escapeReach() === "document" || (target !== null && layer.holds(target)));
}

export function isHeldAbove(layer: OpenLayer, node: Node): boolean {
	return OPEN_LAYERS.slice(indexOf(layer) + 1).some((above) => above.layer.holds(node));
}

export function openLayerCount(): number {
	return OPEN_LAYERS.length;
}

function indexOf(layer: OpenLayer): number {
	return OPEN_LAYERS.findIndex((stacked) => stacked.layer === layer);
}

function isStackedAbove(other: StackedLayer, opened: StackedLayer): boolean {
	if (other.flush !== opened.flush) return other.flush > opened.flush;
	return other.layer.mountOrder > opened.layer.mountOrder;
}

function currentFlush(): number {
	if (isFlushOpen) return flushCount;
	isFlushOpen = true;
	flushCount += 1;
	queueMicrotask(() => {
		isFlushOpen = false;
	});
	return flushCount;
}
