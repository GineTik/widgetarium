import type { SidePlacement } from "../constants/popover";
import { boxOf } from "../utils/floating-placement";
import { useDismissLayer } from "./use-dismiss-layer";
import { useFloatingLayer } from "./use-floating-layer";
import type { FloatingLayer } from "./use-floating-layer";
import type { HoverLayer } from "./use-hover-layer";

export function useHoverContent(layer: HoverLayer, placement: SidePlacement): FloatingLayer {
	const floating = useFloatingLayer({ isOpen: layer.isOpen, anchorBox: boxOf(layer.triggerRef), placement });
	const close = (): void => layer.settle(false);
	useDismissLayer({
		isOpen: layer.isOpen,
		holds: (node) => Boolean(floating.panelRef.current?.contains(node) || layer.triggerRef.current?.contains(node)),
		onEscape: close,
		onOutsidePress: close,
	});
	return floating;
}
