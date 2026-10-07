import { createElement as h, useContext } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";
import { MenuContext } from "./menu-context";

export type MenuShortcutProps = HTMLAttributes<HTMLSpanElement>;

export function MenuShortcut({ className, ...rest }: MenuShortcutProps): ReactElement {
	const family = useContext(MenuContext)?.family ?? "dropdown-menu";
	return <span {...rest} data-slot={`${family}-shortcut`} className={cn("wg-kit-menu-shortcut", className)} />;
}
