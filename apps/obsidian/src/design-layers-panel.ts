import { createElement as h, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement, RefObject } from "react";
import { Icon, IconButton } from "@widgetarium/kit";
import { DESKTOP_FRAME, StateDrawing } from "widgetarium/studio";
import type { StatePicture } from "widgetarium/studio";
import type { Drawing, DrawnScreen } from "./design-canvas-shapes.js";
import { LIVE_SCREEN, ancestorsOf, hitOfMark, parentsOf } from "./design-selection.js";
import type { Hit } from "./design-selection.js";
import { DRAWS_AT_ONCE } from "./design-drawn-when-seen.js";
import { LayerRow } from "./design-layer-row.js";
import { layerMoveTo } from "./layer-moves.js";
import { useLayerDrag } from "./design-layer-drag.js";
import type { Projection } from "./layer-drag.js";
import type { LayerMove } from "./layer-moves.js";
import { layersIn } from "./layer-tree.js";
import type { Layer } from "./layer-tree.js";

export interface LayersPanelProps extends Pick<Drawing, "registry"> {
	readonly screen: DrawnScreen;
	readonly isOpen: boolean;
	readonly keepsLiveCopy: boolean;
	readonly onMove: (widget: string, move: LayerMove) => void;
	readonly picked: string | null;
	readonly onFocus: (focus: LayerFocus | null) => void;
}

export interface LayerFocus {
	readonly screen: string;
	readonly hit: Hit;
}

const TITLE = "Layers";
const LOCKED = "Layout locked: only widgets move";
const UNLOCKED = "Layout unlocked: groups move too";
const NOT_A_PAGE = "This screen is not drawn by a page widget, so it has no layers to show.";
const NOT_MOVABLE = "That place is outside the page's own code, so nothing was moved.";
const INDENT_PX = 14;
const REBUILT_AFTER_MS = 300;
const REFUSAL_SHOWN_MS = 5000;
const UNFOLDED_AFTER_MS = 220;
const LAYERS_SEEN = new Map<string, readonly Layer[]>();

export function LayersPanel({
	screen,
	isOpen,
	keepsLiveCopy,
	registry,
	picked,
	onMove,
	onFocus,
}: LayersPanelProps): ReactElement {
	const [isLocked, setLocked] = useState(true);
	const [refusal, setRefusal] = useRefusalShownForAWhile();
	const [live, setLive] = useState<HTMLDivElement | null>(null);
	const scroller = useRef<HTMLDivElement | null>(null);
	const picture = screen.states[0]?.picture;
	const seen = useLayersOf(live, picture?.widget ?? screen.name);
	const layers = titledLayers(seen ?? [], registry);
	const isShown = isOpen && (seen !== null || !picture);
	const onPick = (mark: string): void => {
		const hit = mark === picked || !live ? null : hitOfMark(live, mark);
		onFocus(hit && picture ? { screen: picture.widget, hit } : null);
	};
	const opened = useMemo(() => ancestorsOf(parentsOf(seen ?? []), picked), [seen, picked]);
	useScrolledToPicked(scroller, picked, isShown);
	const onHover = useCallback((depth: number) => scrollToDepth(scroller.current, depth), []);
	const drag = useLayerDrag(
		scroller,
		INDENT_PX,
		(dragged: string, projection: Projection) => {
			const move = layerMoveTo(dragged, projection.parent, projection.before);
			setRefusal(move ? null : NOT_MOVABLE);
			if (move && picture) onMove(picture.widget, move);
		},
		seen,
	);
	return h("aside", { className: isShown ? "wg-design-layers is-open" : "wg-design-layers", "aria-hidden": !isShown }, [
		layersHeadOf(isLocked, () => setLocked(!isLocked)),
		refusal ? h("p", { key: "refusal", className: "wg-design-layers-said" }, refusal) : null,
		h(
			"div",
			{ key: `tree:${screen.name}:${seen !== null}`, className: "wg-design-layers-tree", ref: scroller },
			picture
				? [
						...layers.map((layer) =>
							h(LayerRow, { key: layer.mark, layer, depth: 0, isLocked, picked, opened, drag, onPick, onHover }),
						),
						drag.slot
							? h("div", {
									key: "slot",
									className: "wg-design-layer-slot",
									style: { top: drag.slot.top, left: drag.slot.left, height: drag.slot.height },
								})
							: null,
					]
				: h("p", { className: "wg-design-layers-said" }, NOT_A_PAGE),
		),
		picture && (isOpen || keepsLiveCopy || seen === null) ? liveCopyOf(picture, registry, setLive) : null,
	]);
}

export function seenLayersOf(widget: string): readonly Layer[] {
	return LAYERS_SEEN.get(widget) ?? [];
}

function layersHeadOf(isLocked: boolean, onToggleLock: () => void): ReactElement {
	return h("header", { key: "head", className: "wg-design-layers-head" }, [
		h("b", { key: "title" }, TITLE),
		h(
			IconButton,
			{ key: "lock", size: "s", variant: "ghost", label: isLocked ? LOCKED : UNLOCKED, onClick: onToggleLock },
			h(Icon, { name: isLocked ? "lock" : "lock-open", size: 14 }),
		),
	]);
}

function liveCopyOf(
	picture: StatePicture,
	registry: Drawing["registry"],
	onNode: (node: HTMLDivElement | null) => void,
): ReactElement {
	return h(
		"div",
		{ key: "live", className: "wg-off-screen", "aria-hidden": true },
		h(
			"div",
			{
				className: "wg-design-screen",
				ref: onNode,
				[LIVE_SCREEN]: picture.widget,
				style: { width: `${DESKTOP_FRAME.width}px` },
			},
			h(DRAWS_AT_ONCE.Provider, { value: true }, h(StateDrawing, { picture, registry })),
		),
	);
}

function useRefusalShownForAWhile(): [string | null, (refusal: string | null) => void] {
	const [refusal, setRefusal] = useState<string | null>(null);
	useEffect(() => {
		if (!refusal) return;
		const timer = window.setTimeout(() => setRefusal(null), REFUSAL_SHOWN_MS);
		return () => window.clearTimeout(timer);
	}, [refusal]);
	return [refusal, setRefusal];
}

function useLayersOf(node: HTMLDivElement | null, key: string): readonly Layer[] | null {
	const [, setSeen] = useState(0);
	useEffect(() => {
		if (!node) return;
		let timer = 0;
		const rebuild = (): void => {
			window.clearTimeout(timer);
			timer = window.setTimeout(() => {
				const layers = layersIn(node);
				const isSame = JSON.stringify(layers) === JSON.stringify(LAYERS_SEEN.get(key) ?? null);
				if (layers.length === 0 || isSame) return;
				LAYERS_SEEN.set(key, layers);
				setSeen((count) => count + 1);
			}, REBUILT_AFTER_MS);
		};
		const watcher = new MutationObserver(rebuild);
		watcher.observe(node, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-wg-node"] });
		rebuild();
		return () => {
			watcher.disconnect();
			window.clearTimeout(timer);
		};
	}, [node, key]);
	return LAYERS_SEEN.get(key) ?? null;
}

function titledLayers(layers: readonly Layer[], registry: Drawing["registry"]): Layer[] {
	return layers.map((layer) => {
		const title = layer.widget ? registry.get(layer.widget)?.manifest["title"] : undefined;
		const name = typeof title === "string" && layer.name === layer.widget ? title : layer.name;
		return { ...layer, name, children: titledLayers(layer.children, registry) };
	});
}

function useScrolledToPicked(held: RefObject<HTMLDivElement | null>, picked: string | null, isShown: boolean): void {
	useEffect(() => {
		if (!picked || !isShown) return;
		const timer = window.setTimeout(() => {
			const scroller = held.current;
			if (!scroller) return;
			const row = scroller.querySelector<HTMLElement>(".wg-design-layer-row.is-picked");
			if (!row) return;
			const top = row.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
			scroller.scrollTo({
				top: top - scroller.clientHeight / 2 + row.offsetHeight / 2,
				left: Math.max(0, Number(row.dataset["depth"] ?? 0) - 1) * INDENT_PX,
				behavior: "smooth",
			});
		}, UNFOLDED_AFTER_MS);
		return () => window.clearTimeout(timer);
	}, [held, picked, isShown]);
}

function scrollToDepth(scroller: HTMLDivElement | null, depth: number): void {
	scroller?.scrollTo({ left: Math.max(0, depth - 1) * INDENT_PX, behavior: "smooth" });
}
