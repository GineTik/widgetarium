import { createElement as h, useContext, useRef } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { LAYOUT_KIND, LAYOUT_KINDS } from "../constants/layout";
import type { LayoutKind } from "../constants/layout";
import { useEdgesOfThePlate } from "../hooks/use-edges-of-the-plate";
import { cn } from "../utils/cn";
import { isOneOf } from "../utils/is-one-of";
import { GROUP, PLATES_ABOVE, warnOnce } from "../utils/surface";
import type { StyleProp } from "../utils/token-style";
import { ActionButton } from "./action-button";
import { LayoutActions } from "./layout-actions";
import { LayoutHeader } from "./layout-header";
import { LayoutItem } from "./layout-item";
import { LayoutTitle } from "./layout-title";
import { RowsWithHeadOutside } from "./rows-with-head-outside";

export { Grid } from "./grid";
export { LayoutActions } from "./layout-actions";
export { LayoutHeader } from "./layout-header";
export { LayoutItem } from "./layout-item";
export { LayoutTitle } from "./layout-title";
export { Rows } from "./rows";
export type { LayoutActionsProps } from "./layout-actions";
export type { LayoutHeaderProps } from "./layout-header";
export type { LayoutItemProps } from "./layout-item";

export type LayoutDivProps = Omit<HTMLAttributes<HTMLDivElement>, "style">;

export interface LayoutProps extends LayoutDivProps {
	readonly kind?: LayoutKind | undefined;
	readonly min?: number;
	readonly style?: StyleProp | undefined;
}

export interface LayoutLook {
	readonly className: string;
	readonly style: StyleProp | undefined;
}

const DEFAULT_CELL_PX = 240;

export function Layout({
	kind = "stack",
	min = DEFAULT_CELL_PX,
	className: cls,
	style,
	children,
	...rest
}: LayoutProps): ReactElement {
	const worn = wornKind(kind);
	const rowsNode = useRef<HTMLDivElement>(null);
	const look: LayoutLook = {
		className: cn("wg-kit-layout", `is-${worn}`, cls),
		style: worn === "grid" ? { "--wg-kit-layout-min": `${min}px`, ...style } : style,
	};
	const held = <LAYOUT_KIND.Provider value={worn}>{children}</LAYOUT_KIND.Provider>;
	const isOnPlate = useContext(PLATES_ABOVE).surface === GROUP;
	useEdgesOfThePlate(rowsNode, worn === "rows" && isOnPlate);
	if (worn === "rows" && !isOnPlate) return <RowsWithHeadOutside rest={rest} look={look} children={held} />;
	if (worn === "rows")
		return <div {...rest} ref={rowsNode} className={cn(look.className, "is-on-plate")} children={held} />;
	return (
		<div {...rest} {...look}>
			{held}
		</div>
	);
}

// TODO: drop the dot aliases once the vault's @default copy is reinstalled
Layout.Header = LayoutHeader;

Layout.Title = LayoutTitle;

Layout.Actions = LayoutActions;

Layout.ActionButton = ActionButton;

Layout.Item = LayoutItem;

function wornKind(kind: unknown): LayoutKind {
	if (isOneOf(LAYOUT_KINDS, kind)) return kind;
	warnOnce(`${String(kind)} is no layout, so a stack was drawn instead: ${LAYOUT_KINDS.join(", ")}`);
	return "stack";
}
