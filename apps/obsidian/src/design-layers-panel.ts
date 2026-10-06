import { createElement as h, useCallback, useEffect, useRef, useState } from "react";
import type { ReactElement, RefObject } from "react";
import { Icon, IconButton } from "@widgetarium/kit";
import type { Drawing, DrawnScreen } from "./design-canvas-shapes.js";
import { DRAWS_AT_ONCE } from "./design-drawn-when-seen.js";
import { LayerRow } from "./design-layer-row.js";
import { StateDrawing } from "./design-state-drawing.js";
import { layerMoveOf } from "./layer-moves.js";
import type { DropPlace, LayerMove } from "./layer-moves.js";
import { layersIn } from "./layer-tree.js";
import type { Layer } from "./layer-tree.js";

export interface LayersPanelProps extends Pick<Drawing, "registry"> {
	readonly screen: DrawnScreen;
	readonly onMove: (widget: string, move: LayerMove) => void;
}

const TITLE = "Layers";
const LOCKED = "Layout locked: only widgets move";
const UNLOCKED = "Layout unlocked: groups move too";
const NOT_A_PAGE = "This screen is not drawn by a page widget, so it has no layers to show.";
const NOT_MOVABLE = "That place is outside the page's own code, so nothing was moved.";
const INDENT_PX = 14;
const REBUILT_AFTER_MS = 300;

export function LayersPanel({ screen, registry, onMove }: LayersPanelProps): ReactElement {
	const [isLocked, setLocked] = useState(true);
	const [refusal, setRefusal] = useState<string | null>(null);
	const live = useRef<HTMLDivElement | null>(null);
	const scroller = useRef<HTMLDivElement | null>(null);
	const layers = titledLayers(useLayersOf(live), registry);
	const picture = screen.states[0]?.picture;
	const onHover = useCallback((depth: number) => scrollToDepth(scroller.current, depth), []);
	const onDrop = (dragged: string, target: string, place: DropPlace): void => {
		const move = layerMoveOf(layers, dragged, target, place);
		setRefusal(move ? null : NOT_MOVABLE);
		if (move && picture) onMove(picture.widget, move);
	};
	return h("aside", { className: "wg-design-layers" }, [
		h("header", { key: "head", className: "wg-design-layers-head" }, [
			h("b", { key: "title" }, TITLE),
			h(
				IconButton,
				{
					key: "lock",
					size: "s",
					variant: "ghost",
					label: isLocked ? LOCKED : UNLOCKED,
					onClick: () => setLocked(!isLocked),
				},
				h(Icon, { name: isLocked ? "lock" : "lock-open", size: 14 }),
			),
		]),
		refusal ? h("p", { key: "refusal", className: "wg-design-layers-said" }, refusal) : null,
		h(
			"div",
			{ key: "tree", className: "wg-design-layers-tree", ref: scroller },
			picture
				? layers.map((layer) => h(LayerRow, { key: layer.mark, layer, depth: 0, isLocked, onHover, onDrop }))
				: h("p", { className: "wg-design-layers-said" }, NOT_A_PAGE),
		),
		picture
			? h(
					"div",
					{ key: "live", className: "wg-off-screen", ref: live, "aria-hidden": true },
					h(DRAWS_AT_ONCE.Provider, { value: true }, h(StateDrawing, { picture, registry })),
				)
			: null,
	]);
}

function useLayersOf(live: RefObject<HTMLDivElement | null>): readonly Layer[] {
	const [layers, setLayers] = useState<readonly Layer[]>([]);
	useEffect(() => {
		const node = live.current;
		if (!node) return;
		let timer = 0;
		const rebuild = (): void => {
			window.clearTimeout(timer);
			timer = window.setTimeout(() => setLayers(layersIn(node)), REBUILT_AFTER_MS);
		};
		const watcher = new MutationObserver(rebuild);
		watcher.observe(node, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-wg-node"] });
		rebuild();
		return () => {
			watcher.disconnect();
			window.clearTimeout(timer);
		};
	}, [live]);
	return layers;
}

function titledLayers(layers: readonly Layer[], registry: Drawing["registry"]): Layer[] {
	return layers.map((layer) => {
		const title = layer.widget ? registry.get(layer.widget)?.manifest["title"] : undefined;
		const name = typeof title === "string" && layer.name === layer.widget ? title : layer.name;
		return { ...layer, name, children: titledLayers(layer.children, registry) };
	});
}

function scrollToDepth(scroller: HTMLDivElement | null, depth: number): void {
	scroller?.scrollTo({ left: Math.max(0, depth - 1) * INDENT_PX, behavior: "smooth" });
}
