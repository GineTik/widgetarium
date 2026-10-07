import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { chain } from "../utils/chain";
import { cn } from "../utils/cn";
import { moveAcrossNavigation } from "../utils/navigation-menu";

export type NavigationMenuListProps = HTMLAttributes<HTMLUListElement>;

export function NavigationMenuList({ className, onKeyDown, ...rest }: NavigationMenuListProps): ReactElement {
	return (
		<ul
			{...rest}
			data-slot="navigation-menu-list"
			className={cn("wg-kit-nav-list", className)}
			onKeyDown={chain(onKeyDown, moveAcrossNavigation)}
		/>
	);
}
