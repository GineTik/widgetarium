import type { MenuState } from "../components/menu-context";
import type { SidePlacement } from "../constants/popover";
import { useDismissLayer } from "./use-dismiss-layer";
import { useFloatingLayer } from "./use-floating-layer";
import type { FloatingLayer } from "./use-floating-layer";
import { useMenuFocus } from "./use-menu-focus";

export function useMenuPanel(menu: MenuState, placement: SidePlacement): FloatingLayer {
	const floating = useFloatingLayer({ isOpen: menu.isOpen, anchorBox: menu.anchorBox, placement });
	useDismissLayer({
		isOpen: menu.isOpen,
		holds: menu.isInside,
		onEscape: menu.closeTree,
		onOutsidePress: menu.closeTree,
	});
	useMenuFocus(menu, floating.panelRef);
	return floating;
}
