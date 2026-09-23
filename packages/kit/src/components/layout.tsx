import { createElement as h, useContext, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HEAD_OUTSIDE, LAYOUT_KIND, LAYOUT_KINDS } from "../constants/layout";
import { useEdgesOfThePlate } from "../hooks/use-edges-of-the-plate";
import type { LooseProps } from "../types";
import { cx } from "../utils/cx";
import { GROUP, PLATES_ABOVE, warnOnce } from "../utils/surface";
import { tonedPlateClass } from "../utils/tones";
import { ActionButton } from "./button";
import { Card } from "./card";
import { Heading } from "./heading";

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

// TODO: drop the dot aliases once the vault's @default copy is reinstalled
Layout.Header = LayoutHeader;

Layout.Title = LayoutTitle;

Layout.Actions = LayoutActions;

Layout.ActionButton = ActionButton;

Layout.Item = LayoutItem;

export function LayoutHeader({ title, className: cls, children, ...rest }: LooseProps) {
	const headPlace = useContext(HEAD_OUTSIDE);
	const drawn = (
		<div {...rest} className={cx("wg-kit-layout-head", headPlace && "is-outside", cls)}>
			{title ? <LayoutTitle>{title}</LayoutTitle> : null}
			{title && children ? <LayoutActions>{children}</LayoutActions> : children}
		</div>
	);
	if (headPlace) return createPortal(drawn, headPlace);
	return drawn;
}

const LAYOUT_TITLE_LEVEL = 3;

const LAYOUT_TITLE_SIZE = 4;

export function LayoutTitle({
	level = LAYOUT_TITLE_LEVEL,
	size = LAYOUT_TITLE_SIZE,
	className: cls,
	...rest
}: LooseProps) {
	return <Heading {...rest} level={level} size={size} className={cx("wg-kit-layout-title", cls)} />;
}

export function LayoutActions({ className: cls, children, ...rest }: LooseProps) {
	return (
		<div {...rest} className={cx("wg-kit-layout-actions", cls)}>
			{children}
		</div>
	);
}

export function LayoutItem({ tone, className: cls, children, ...rest }: LooseProps) {
	const kind = useContext(LAYOUT_KIND);
	const itemClass = cx("wg-kit-layout-item", cls);
	if (kind === "grid" || kind === "row")
		return (
			<Card {...rest} tone={tone} className={itemClass}>
				{children}
			</Card>
		);
	if (kind === "rows")
		return (
			<div {...rest} className={cx(itemClass, tonedPlateClass(tone))}>
				{children}
			</div>
		);
	return (
		<div {...rest} className={itemClass}>
			{children}
		</div>
	);
}

function RowsWithHeadOutside({ rest, look, children }: LooseProps) {
	const [headPlace, setHeadPlace] = useState(null);
	return (
		<div className="wg-kit-layout-block">
			<div ref={setHeadPlace} className="wg-kit-layout-heads" />
			<HEAD_OUTSIDE.Provider value={headPlace}>
				<Card {...rest} {...look}>
					{children}
				</Card>
			</HEAD_OUTSIDE.Provider>
		</div>
	);
}

export function Rows(props) {
	return <Layout {...props} kind="rows" />;
}

Rows.Header = LayoutHeader;

Rows.Title = LayoutTitle;

Rows.Actions = LayoutActions;

Rows.ActionButton = ActionButton;

Rows.Item = LayoutItem;

export function Grid(props) {
	return <Layout {...props} kind="grid" />;
}

Grid.Header = LayoutHeader;

Grid.Title = LayoutTitle;

Grid.Actions = LayoutActions;

Grid.ActionButton = ActionButton;

Grid.Item = LayoutItem;
