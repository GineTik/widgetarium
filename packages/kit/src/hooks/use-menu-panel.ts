import type { MenuState } from "../components/menu-context";
import type { SidePlacement } from "../constants/popover";
import { useEscapeLayer } from "./use-escape-layer";
import { useFloatingLayer } from "./use-floating-layer";
import type { FloatingLayer } from "./use-floating-layer";
import { useMenuFocus } from "./use-menu-focus";
import { useOutsidePress } from "./use-outside-press";

export function useMenuPanel(menu: MenuState, placement: SidePlacement): FloatingLayer {
	const floating = useFloatingLayer({ isOpen: menu.isOpen, anchorBox: menu.anchorBox, placement });
	useOutsidePress({ isOpen: menu.isOpen, isInside: menu.isInside, onOutside: menu.closeTree });
	useEscapeLayer(menu.isOpen, menu.closeTree);
	useMenuFocus(menu, floating.panelRef);
	return floating;
}
