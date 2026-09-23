import { createElement as h } from "react";
import type { LooseProps } from "../types";
import { listClass, rowClass } from "../utils/class-names";
import { cx } from "../utils/cx";
import { slotted } from "./slot";

export const List = slotted("div", listClass, "List");

export const Row = slotted("div", rowClass, "Row");

export const RowBadge = slotted("span", (props) => cx("wg-kit-row-badge", props.className), "RowBadge");

export const RowLabel = slotted("span", (props) => cx("wg-kit-row-label", props.className), "RowLabel");

export const RowValue = slotted("span", (props) => cx("wg-kit-row-value", props.className), "RowValue");

export function SlotList({ slot: Drawn, rows = [], give, keyOf, className: cls, style, children }: LooseProps) {
	if (!Drawn) return null;
	return (
		<div className={cx("wg-kit-slot-list", cls)} style={style} data-cards={Drawn.isCard ? "" : undefined}>
			{children ?? rows.map((row, at) => <Drawn key={keyOf ? keyOf(row) : at} {...give(row)} />)}
		</div>
	);
}
