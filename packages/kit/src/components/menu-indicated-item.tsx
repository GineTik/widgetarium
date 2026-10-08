import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement, ReactNode } from "react";
import { cn } from "../utils/cn";
import { menuItemHandlers, menuItemMarks } from "../utils/menu-item";
import { useMenu } from "./menu-context";

export interface IndicatedKind {
	readonly role: "menuitemcheckbox" | "menuitemradio";
	readonly part: string;
	readonly marks: {
		readonly "aria-checked": boolean | "mixed";
		readonly "data-state": string;
	};
	readonly indicator: ReactNode;
}

export interface MenuIndicatedItemProps extends Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> {
	readonly kind: IndicatedKind;
	readonly disabled?: boolean | undefined;
	readonly inset?: boolean | undefined;
	readonly onSelect: (event: Event) => void;
}

export function MenuIndicatedItem({ kind, className, children, ...item }: MenuIndicatedItemProps): ReactElement {
	const menu = useMenu();
	const { disabled, inset, onSelect, ...rest } = item;
	return (
		<div
			role={kind.role}
			{...kind.marks}
			{...rest}
			{...menuItemMarks(menu, { part: kind.part, inset, disabled })}
			{...menuItemHandlers(menu, { disabled, onSelect, theirs: rest })}
			className={cn("wg-kit-menu-item is-indicated", className)}
		>
			<span className="wg-kit-menu-indicator">{kind.indicator}</span>
			{children}
		</div>
	);
}
