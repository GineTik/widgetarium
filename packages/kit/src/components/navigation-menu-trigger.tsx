import { createElement as h } from "react";
import type { ButtonHTMLAttributes, KeyboardEvent, PointerEvent, ReactElement } from "react";
import { HOVER_GRACE_MS } from "../constants/overlays";
import { Icon } from "../icons/icon";
import { chain } from "../utils/chain";
import { focusFirstLinkIn, navigationMenuTriggerStyle } from "../utils/navigation-menu";
import {
	NAVIGATION_ATTRIBUTE,
	NAVIGATION_VALUE_ATTRIBUTE,
	useNavigationItem,
	useNavigationMenu,
} from "./navigation-menu-context";
import type { NavigationItemState, NavigationMenuState } from "./navigation-menu-context";
import { dataStateOf } from "./popover-context";

export type NavigationMenuTriggerProps = ButtonHTMLAttributes<HTMLButtonElement>;

const CHEVRON_PX = 14;

export function NavigationMenuTrigger({
	className,
	children,
	onClick,
	onKeyDown,
	onPointerEnter,
	onPointerLeave,
	...rest
}: NavigationMenuTriggerProps): ReactElement {
	const nav = useNavigationMenu();
	const item = useNavigationItem();
	const isOpen = nav.value === item.value;
	return (
		<button
			type="button"
			aria-expanded={isOpen}
			{...rest}
			{...{ [NAVIGATION_VALUE_ATTRIBUTE]: item.value }}
			ref={(node: HTMLButtonElement | null) => {
				item.triggerRef.current = node;
			}}
			data-slot="navigation-menu-trigger"
			data-state={dataStateOf(isOpen)}
			className={navigationMenuTriggerStyle(["group", className])}
			onClick={chain(onClick, () => toggleNavigationItem(nav, item))}
			onKeyDown={chain(onKeyDown, (event: KeyboardEvent<HTMLElement>) => openOnArrowDown(nav, item, event))}
			onPointerEnter={chain(onPointerEnter, (event: PointerEvent<HTMLElement>) => openOnHover(nav, item, event))}
			onPointerLeave={chain(onPointerLeave, () => nav.delayed.start(() => nav.setValue(""), HOVER_GRACE_MS))}
		>
			{children}
			<Icon name="chevron-down" size={CHEVRON_PX} className="wg-kit-nav-chevron" aria-hidden="true" />
		</button>
	);
}

function toggleNavigationItem(nav: NavigationMenuState, item: NavigationItemState): void {
	nav.delayed.stop();
	nav.setValue(nav.value === item.value ? "" : item.value);
}

function openOnHover(nav: NavigationMenuState, item: NavigationItemState, event: PointerEvent<HTMLElement>): void {
	if (event.pointerType === "touch") return;
	nav.delayed.start(() => nav.setValue(item.value), nav.value === "" ? nav.openDelay : 0);
}

function openOnArrowDown(nav: NavigationMenuState, item: NavigationItemState, event: KeyboardEvent<HTMLElement>): void {
	if (event.key !== "ArrowDown") return;
	event.preventDefault();
	nav.delayed.stop();
	nav.setValue(item.value);
	focusFirstLinkIn(() => document.querySelector(`[${NAVIGATION_ATTRIBUTE}="${nav.id}"]`));
}
