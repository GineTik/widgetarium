import { pointBox, useContextMenuPoint } from "../components/context-menu-point";
import type { MenuState } from "../components/menu-context";

export type OpenAt = (x: number, y: number) => void;

export function useOpensAtPoint(menu: MenuState): OpenAt {
	const setPoint = useContextMenuPoint();
	return (x, y) => {
		setPoint(pointBox(x, y));
		menu.focusIntent.current = "panel";
		menu.setOpen(true);
	};
}
