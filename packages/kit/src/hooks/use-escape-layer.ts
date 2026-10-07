import { useEffect, useRef } from "react";
import { closeLayer, isTopLayer, openLayer } from "../utils/layer-stack";

const CAPTURE_PAST_THE_EDITOR_SHIELD = true;

export function useEscapeLayer(isOpen: boolean, onEscape: () => void): void {
	const latest = useRef(onEscape);
	latest.current = onEscape;
	useEffect(() => {
		if (!isOpen) return undefined;
		const layer = openLayer();
		const closeOnEscape = (event: KeyboardEvent): void => {
			if (event.key !== "Escape" || !isTopLayer(layer)) return;
			event.preventDefault();
			latest.current();
		};
		document.addEventListener("keydown", closeOnEscape, CAPTURE_PAST_THE_EDITOR_SHIELD);
		return () => {
			closeLayer(layer);
			document.removeEventListener("keydown", closeOnEscape, CAPTURE_PAST_THE_EDITOR_SHIELD);
		};
	}, [isOpen]);
}
