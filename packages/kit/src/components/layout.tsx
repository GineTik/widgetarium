import type { LooseProps } from "../types";
import { createElement as h, useContext, useRef } from "react";
import { ActionButton } from "./action-button";
import { LayoutActions } from "./layout-actions";
import { LayoutHeader } from "./layout-header";
import { LayoutItem } from "./layout-item";
import { LayoutTitle } from "./layout-title";
import { RowsWithHeadOutside } from "./rows-with-head-outside";
import { LAYOUT_KIND, LAYOUT_KINDS } from "../constants/layout";
import { useEdgesOfThePlate } from "../hooks/use-edges-of-the-plate";
import { cx } from "../utils/cx";
import { GROUP, PLATES_ABOVE, warnOnce } from "../utils/surface";

const DEFAULT_CELL_PX = 240;

function wornKind(kind) {
	if (LAYOUT_KINDS.includes(kind)) return kind;
	warnOnce(`${kind} is no layout, so a stack was drawn instead: ${LAYOUT_KINDS.join(", ")}`);
	return "stack";
}

export function Layout({
	kind = "stack",
	min = DEFAULT_CELL_PX,
	className: cls,
	style,
	children,
	...rest
}: LooseProps) {
	const worn = wornKind(kind);
	const rowsNode = useRef(null);
	const look = {
		className: cx("wg-kit-layout", `is-${worn}`, cls),
		style: worn === "grid" ? { "--wg-kit-layout-min": `${min}px`, ...style } : style,
	};
	const held = <LAYOUT_KIND.Provider value={worn}>{children}</LAYOUT_KIND.Provider>;
	const isOnPlate = useContext(PLATES_ABOVE).surface === GROUP;
	useEdgesOfThePlate(rowsNode, worn === "rows" && isOnPlate);
	if (worn === "rows" && !isOnPlate)
		return (
			<RowsWithHeadOutside rest={rest} look={look}>
				{held}
			</RowsWithHeadOutside>
		);
	if (worn === "rows")
		return (
			<div {...rest} ref={rowsNode} className={cx(look.className, "is-on-plate")}>
				{held}
			</div>
		);
	return (
		<div {...rest} {...look}>
			{held}
		</div>
	);
}

Layout.Header = LayoutHeader;

Layout.Title = LayoutTitle;

Layout.Actions = LayoutActions;

Layout.ActionButton = ActionButton;

Layout.Item = LayoutItem;
