import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement, ReactNode } from "react";
import { rowClass } from "../utils/class-names";
import { cn } from "../utils/cn";
import { RowLabel, RowValue } from "./list";
import type { SidebarTag } from "./sidebar";

export interface SidebarRowState {
	readonly unset?: boolean | undefined;
	readonly isOpen?: boolean | undefined;
	readonly pressable?: boolean | undefined;
}

export interface SidebarRowProps extends HTMLAttributes<HTMLElement> {
	readonly as?: SidebarTag;
	readonly icon?: ReactNode;
	readonly label?: ReactNode;
	readonly sub?: ReactNode;
	readonly value?: ReactNode;
	readonly after?: ReactNode;
	readonly selected?: boolean | undefined;
	readonly state?: SidebarRowState;
}

// TRADE-OFF: the row owns its tag — a settings row is read, a property row is pressed and must be a button
export function SidebarRow({
	as = "div",
	icon,
	label,
	sub,
	value,
	after,
	children,
	selected,
	state = {},
	className: cls,
	...rest
}: SidebarRowProps): ReactElement {
	const shown = value ?? children;
	return h(
		as,
		{
			...rest,
			type: as === "button" ? "button" : undefined,
			"aria-current": selected ? "true" : undefined,
			className: cn(
				rowClass({ pressable: state.pressable || as === "button" }),
				"wg-kit-side-row",
				Boolean(sub) && "is-two",
				state.unset && "is-unset",
				state.isOpen && "is-open",
				selected && "is-selected",
				cls,
			),
		},
		[
			icon ? (
				<span className="wg-kit-side-icon" key="icon">
					{icon}
				</span>
			) : null,
			<RowLabel key="label">
				{sub
					? [
							label,
							<span className="wg-kit-side-sub" key="sub">
								{sub}
							</span>,
						]
					: label}
			</RowLabel>,
			shown === undefined || shown === null ? null : (
				<RowValue className="wg-kit-side-value" key="value">
					{shown}
				</RowValue>
			),
			after ?? null,
		],
	);
}
