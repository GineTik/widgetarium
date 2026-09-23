import { createElement as h } from "react";
import type { LooseProps } from "../types";
import { listClass, rowClass } from "../utils/class-names";
import { cx } from "../utils/cx";
import { render } from "../utils/render";

export function List(props) {
	return render("div", props, listClass(props));
}

export function Row(props) {
	return render("div", props, rowClass(props));
}

function rowPart(baseClass, name) {
	function Part(props) {
		return render("span", props, cx(baseClass, props.className));
	}
	Part.displayName = name;
	return Part;
}

export const RowBadge = rowPart("wg-kit-row-badge", "RowBadge");

export const RowLabel = rowPart("wg-kit-row-label", "RowLabel");

export const RowValue = rowPart("wg-kit-row-value", "RowValue");

export function SlotList({ slot: Drawn, rows = [], give, keyOf, className: cls, style, children }: LooseProps) {
	if (!Drawn) return null;
	return (
		<div className={cx("wg-kit-slot-list", cls)} style={style} data-cards={Drawn.isCard ? "" : undefined}>
			{children ?? rows.map((row, at) => <Drawn key={keyOf ? keyOf(row) : at} {...give(row)} />)}
		</div>
	);
}
