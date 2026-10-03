const LAYER_CLASS = "wg-root wg-portal wg-kit-portal-layer";

export function portalLayer(): HTMLElement {
	const held = document.body.querySelector<HTMLElement>(":scope > .wg-kit-portal-layer");
	if (held) return held;
	const layer = document.createElement("div");
	layer.className = LAYER_CLASS;
	document.body.appendChild(layer);
	return layer;
}
