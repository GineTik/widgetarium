import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { menuSlot, useMenu } from "./menu-context";

export type MenuGroupProps = HTMLAttributes<HTMLDivElement>;

export function MenuGroup(props: MenuGroupProps): ReactElement {
	const menu = useMenu();
	return <div role="group" {...props} data-slot={menuSlot(menu, "group")} />;
}
