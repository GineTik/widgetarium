import type { SidePlacement } from "../constants/popover";
import { boxOf } from "../utils/floating-placement";
import { useEscapeLayer } from "./use-escape-layer";
import { useFloatingLayer } from "./use-floating-layer";
import type { FloatingLayer } from "./use-floating-layer";
import type { HoverLayer } from "./use-hover-layer";
import { useOutsidePress } from "./use-outside-press";

export function useHoverContent(layer: HoverLayer, placement: SidePlacement): FloatingLayer {
	const floating = useFloatingLayer({ isOpen: layer.isOpen, anchorBox: boxOf(layer.triggerRef), placement });
	const close = (): void => layer.settle(false);
	useEscapeLayer(layer.isOpen, close);
	useOutsidePress({
		isOpen: layer.isOpen,
		isInside: (node) => Boolean(floating.panelRef.current?.contains(node) || layer.triggerRef.current?.contains(node)),
		onOutside: close,
	});
	return floating;
}
