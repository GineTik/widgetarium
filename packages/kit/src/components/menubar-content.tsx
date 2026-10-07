import { createElement as h, useContext } from "react";
import type { KeyboardEvent, ReactElement } from "react";
import { chain } from "../utils/chain";
import { isNode } from "../utils/dom-nodes";
import { MenuContent } from "./menu-content";
import type { MenuContentProps } from "./menu-content";
import { MenubarValueContext, openNeighbour, useMenubar } from "./menubar-context";

export type MenubarContentProps = MenuContentProps;

const BELOW_THE_BAR_PX = 8;

const LEVEL_WITH_THE_TRIGGER_PX = -4;

const NEIGHBOUR_STEP: ReadonlyMap<string, 1 | -1> = new Map<string, 1 | -1>([
	["ArrowRight", 1],
	["ArrowLeft", -1],
]);

export function MenubarContent({ onKeyDown, ...props }: MenubarContentProps): ReactElement {
	const bar = useMenubar();
	const own = useContext(MenubarValueContext);
	const crossToNeighbour = (event: KeyboardEvent<HTMLDivElement>): void => {
		const step = NEIGHBOUR_STEP.get(event.key);
		if (step === undefined || !isNode(event.target) || !event.currentTarget.contains(event.target)) return;
		event.preventDefault();
		openNeighbour(bar, own, step);
	};
	return (
		<MenuContent
			align="start"
			sideOffset={BELOW_THE_BAR_PX}
			alignOffset={LEVEL_WITH_THE_TRIGGER_PX}
			{...props}
			onKeyDown={chain(onKeyDown, crossToNeighbour)}
		/>
	);
}
