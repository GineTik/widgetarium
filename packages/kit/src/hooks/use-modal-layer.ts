import { useId, useRef } from "react";
import type { RefObject } from "react";
import { MODAL_EXIT_MS } from "../constants/overlays";
import type { ModalIds } from "../components/modal-ids-context";
import { useEscapeLayer } from "./use-escape-layer";
import { useFocusTrap } from "./use-focus-trap";
import { useOverlayLayer } from "./use-overlay-layer";
import { usePresence } from "./use-presence";

export interface ModalLayerState {
	readonly isMounted: boolean;
	readonly layer: HTMLElement | null;
	readonly isScoped: boolean;
	readonly anchorRef: RefObject<HTMLSpanElement | null>;
	readonly panelRef: RefObject<HTMLDivElement | null>;
	readonly ids: ModalIds;
}

export function useModalLayer(isOpen: boolean, onEscape: () => void): ModalLayerState {
	const { isMounted } = usePresence(isOpen, MODAL_EXIT_MS);
	const { anchorRef, layer, isScoped } = useOverlayLayer(isOpen);
	const panelRef = useRef<HTMLDivElement>(null);
	const titleId = useId();
	const descriptionId = useId();
	useEscapeLayer(isOpen, onEscape);
	useFocusTrap(panelRef, isOpen && layer !== null);
	return { isMounted, layer, isScoped, anchorRef, panelRef, ids: { titleId, descriptionId } };
}
