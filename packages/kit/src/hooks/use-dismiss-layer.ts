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

export function useDismissLayer(ask: DismissLayerAsk): void {
	const latest = useRef(ask);
	latest.current = ask;
	const [mountOrder] = useState(nextMountOrder);
	useEffect(() => {
		if (!ask.isOpen) return undefined;
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
	}, [ask.isOpen]);
}

function listenForDismiss(layer: OpenLayer, latest: RefObject<DismissLayerAsk>): () => void {
	const dismissOnEscape = (event: KeyboardEvent): void => {
		if (event.key !== "Escape" || event.defaultPrevented) return;
		if (layerTakingEscape(isNode(event.target) ? event.target : null) !== layer) return;
		event.preventDefault();
		latest.current.onEscape();
	};
	const dismissOnOutsidePress = (event: Event): void => {
		const { onOutsidePress } = latest.current;
		if (!onOutsidePress || !isNode(event.target)) return;
		if (layer.holds(event.target) || isHeldAbove(layer, event.target)) return;
		onOutsidePress();
	};
	document.addEventListener("keydown", dismissOnEscape, CAPTURE_PAST_THE_EDITOR_SHIELD);
	for (const name of PRESS_EVENTS)
		document.addEventListener(name, dismissOnOutsidePress, CAPTURE_PAST_THE_EDITOR_SHIELD);
	return () => {
		document.removeEventListener("keydown", dismissOnEscape, CAPTURE_PAST_THE_EDITOR_SHIELD);
		for (const name of PRESS_EVENTS)
			document.removeEventListener(name, dismissOnOutsidePress, CAPTURE_PAST_THE_EDITOR_SHIELD);
	};
}
