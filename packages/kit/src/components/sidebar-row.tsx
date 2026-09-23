import type { LooseProps } from "../types";
import { createElement as h } from "react";
import { RowLabel, RowValue } from "./row-parts";
import { rowClass } from "../utils/class-names";
import { cx } from "../utils/cx";

export function SidebarRow({
	as = "div",
	icon,
	label,
	sub,
	value,
	after,
	children,
	unset,
	isOpen,
	selected,
	pressable,
	onClick,
	className: cls,
	...rest
}: LooseProps) {
	const shown = value ?? children;
	// TRADE-OFF: the row owns its TAG, because a settings row is read and a property row is
	// pressed — and a pressable div is a button a keyboard cannot reach
	return h(
		as,
		{
			...rest,
			type: as === "button" ? "button" : undefined,
			onClick,
			// CONTEXT: aria-current is how a list says which of its rows is the one being read
			"aria-current": selected ? "true" : undefined,
			// CONTEXT: is-two is the row's own state — the height law reads it, not the caller's markup
			className: cx(
				rowClass({ pressable: pressable || as === "button" }),
				"wg-kit-side-row",
				sub && "is-two",
				unset && "is-unset",
				isOpen && "is-open",
				selected && "is-selected",
				cls,
			),
		},
		[
			// CONTEXT: a glyph, never RowBadge — a badge is a FILLED marker, and putting an icon in
			// one painted every property row with an accent tile
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
