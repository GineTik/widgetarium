import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { CAPTURE_PAST_THE_EDITOR_SHIELD, PRESS_EVENTS } from "../constants/popover";
import { isNode } from "../utils/dom-nodes";
import { closeLayer, isHeldAbove, layerTakingEscape, nextMountOrder, openLayer } from "../utils/layer-stack";
import type { EscapeReach, OpenLayer } from "../utils/layer-stack";

export interface DismissLayerAsk {
	readonly isOpen: boolean;
	readonly holds: (node: Node) => boolean;
	readonly onEscape: () => void;
	readonly onOutsidePress?: (() => void) | undefined;
	readonly escapeReach?: EscapeReach | undefined;
}

type LatestAsk = RefObject<DismissLayerAsk>;

export function useDismissLayer(ask: DismissLayerAsk): void {
	const latest = useRef(ask);
	latest.current = ask;
	const [mountOrder] = useState(nextMountOrder);
	useEffect(() => {
		if (!ask.isOpen) return undefined;
		return holdLayerOpen(latest, mountOrder);
	}, [ask.isOpen]);
}

function holdLayerOpen(latest: LatestAsk, mountOrder: number): () => void {
	const layer: OpenLayer = {
		holds: (node) => latest.current.holds(node),
		escapeReach: () => latest.current.escapeReach ?? "document",
		mountOrder,
	};
	openLayer(layer);
	const stopListening = listenForDismiss(layer, latest);
	return () => {
		closeLayer(layer);
		stopListening();
	};
}

function listenForDismiss(layer: OpenLayer, latest: LatestAsk): () => void {
	const dismissOnEscape = escapeDismissal(layer, latest);
	const dismissOnOutsidePress = outsidePressDismissal(layer, latest);
	document.addEventListener("keydown", dismissOnEscape, CAPTURE_PAST_THE_EDITOR_SHIELD);
	for (const name of PRESS_EVENTS)
		document.addEventListener(name, dismissOnOutsidePress, CAPTURE_PAST_THE_EDITOR_SHIELD);
	return () => {
		document.removeEventListener("keydown", dismissOnEscape, CAPTURE_PAST_THE_EDITOR_SHIELD);
		for (const name of PRESS_EVENTS)
			document.removeEventListener(name, dismissOnOutsidePress, CAPTURE_PAST_THE_EDITOR_SHIELD);
	};
}

function escapeDismissal(layer: OpenLayer, latest: LatestAsk): (event: KeyboardEvent) => void {
	return (event) => {
		if (event.key !== "Escape" || event.defaultPrevented) return;
		if (layerTakingEscape(isNode(event.target) ? event.target : null) !== layer) return;
		event.preventDefault();
		latest.current.onEscape();
	};
}

function outsidePressDismissal(layer: OpenLayer, latest: LatestAsk): (event: Event) => void {
	return (event) => {
		const { onOutsidePress } = latest.current;
		if (!onOutsidePress || !isNode(event.target)) return;
		if (layer.holds(event.target) || isHeldAbove(layer, event.target)) return;
		onOutsidePress();
	};
}
