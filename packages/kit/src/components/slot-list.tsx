import type { LooseProps } from "../types";
import { createElement as h } from "react";
import { cx } from "../utils/cx";

export function SlotList({ slot: Drawn, rows = [], give, keyOf, className: cls, style, children }: LooseProps) {
	if (!Drawn) return null;
	return (
		<div className={cx("wg-kit-slot-list", cls)} style={style} data-cards={Drawn.isCard ? "" : undefined}>
			{children ?? rows.map((row, at) => <Drawn key={keyOf ? keyOf(row) : at} {...give(row)} />)}
		</div>
	);
}
