import { createElement as h, useMemo } from "react";
import type { ButtonHTMLAttributes, KeyboardEvent, PointerEvent, ReactElement } from "react";
import { HOVER_GRACE_MS } from "../constants/overlays";
import { Icon } from "../icons/icon";
import { chainHandlers } from "../utils/chain";
import { focusFirstLinkIn, navigationMenuTriggerStyle } from "../utils/navigation-menu";
import {
	NAVIGATION_ATTRIBUTE,
	NAVIGATION_VALUE_ATTRIBUTE,
	useNavigationItem,
	useNavigationMenu,
} from "./navigation-menu-context";
import type { NavigationItemState, NavigationMenuState } from "./navigation-menu-context";
import { dataStateOf } from "./popover-context";
import { composeRefs } from "./slot";

export type NavigationMenuTriggerProps = ButtonHTMLAttributes<HTMLButtonElement>;

type TriggerHandlers = Required<
	Pick<ButtonHTMLAttributes<HTMLElement>, "onClick" | "onKeyDown" | "onPointerEnter" | "onPointerLeave">
>;

const CHEVRON_PX = 14;

export function NavigationMenuTrigger({ className, children, ...rest }: NavigationMenuTriggerProps): ReactElement {
	const nav = useNavigationMenu();
	const item = useNavigationItem();
	const isOpen = nav.value === item.value;
	const triggerRef = useMemo(() => composeRefs(item.triggerRef), [item.triggerRef]);
	return (
		<button
			type="button"
			aria-expanded={isOpen}
			{...rest}
			{...{ [NAVIGATION_VALUE_ATTRIBUTE]: item.value }}
			ref={triggerRef}
			data-slot="navigation-menu-trigger"
			data-state={dataStateOf(isOpen)}
			className={navigationMenuTriggerStyle(["group", className])}
			{...navigationTriggerHandlers(nav, item, rest)}
		>
			{children}
			<Icon name="chevron-down" size={CHEVRON_PX} className="wg-kit-nav-chevron" aria-hidden="true" />
		</button>
	);
}

function navigationTriggerHandlers(
	nav: NavigationMenuState,
	item: NavigationItemState,
	theirs: Partial<TriggerHandlers>,
): TriggerHandlers {
	return {
		onClick: chainHandlers(theirs.onClick, () => toggleNavigationItem(nav, item)),
		onKeyDown: chainHandlers(theirs.onKeyDown, (event: KeyboardEvent<HTMLElement>) =>
			openOnArrowDown(nav, item, event),
		),
		onPointerEnter: chainHandlers(theirs.onPointerEnter, (event: PointerEvent<HTMLElement>) =>
			openOnHover(nav, item, event),
		),
		onPointerLeave: chainHandlers(theirs.onPointerLeave, () =>
			nav.delayed.start(() => nav.setValue(""), HOVER_GRACE_MS),
		),
	};
}

function toggleNavigationItem(nav: NavigationMenuState, item: NavigationItemState): void {
	nav.delayed.stop();
	const isOpen = nav.value === item.value;
	const isHeldOpenByHover = isOpen && nav.openedByHover.current === item.value;
	nav.openedByHover.current = "";
	if (isHeldOpenByHover) return;
	nav.setValue(isOpen ? "" : item.value);
}

function openOnHover(nav: NavigationMenuState, item: NavigationItemState, event: PointerEvent<HTMLElement>): void {
	if (event.pointerType === "touch") return;
	nav.delayed.start(
		() => {
			nav.openedByHover.current = item.value;
			nav.setValue(item.value);
		},
		nav.value === "" ? nav.openDelay : 0,
	);
}

function openOnArrowDown(nav: NavigationMenuState, item: NavigationItemState, event: KeyboardEvent<HTMLElement>): void {
	if (event.key !== "ArrowDown") return;
	event.preventDefault();
	nav.delayed.stop();
	nav.setValue(item.value);
	focusFirstLinkIn(() => document.querySelector(`[${NAVIGATION_ATTRIBUTE}="${nav.id}"]`));
}
