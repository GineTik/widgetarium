import { createElement as h, useEffect, useRef, useState } from "react";
import type { LooseProps } from "../types";
import { rowClass, sidebarClass } from "../utils/class-names";
import { cx } from "../utils/cx";
import { render } from "../utils/render";
import { List, RowLabel, RowValue } from "./list";

export function Sidebar({ as = "div", ...props }: LooseProps) {
	return render(as, props, sidebarClass(props));
}

const SHEET_COMMIT = 0.4;

export function SidebarSheet({
	as = "div",
	mode,
	surface,
	isOpen,
	onOpen,
	onHeight,
	peekPx = 220,
	maxPx = 640,
	grip = "Raise the sheet",
	className: cls,
	style,
	children,
	...rest
}: LooseProps) {
	const [dragged, setDragged] = useState(null);
	const from = useRef(null);
	const latest = useRef(0);

	const height = dragged ?? (isOpen ? maxPx : peekPx);
	latest.current = height;

	// CONTEXT: the sheet OWNS its height, so anything that has to stand clear of it is told —
	// a second place computing the same number was what put the controls under the panel
	useEffect(() => {
		onHeight?.(height);
	}, [height]);

	const start = (event) => {
		from.current = { y: event.clientY, height: latest.current };
		event.currentTarget.setPointerCapture?.(event.pointerId);
		setDragged(latest.current);
	};

	const move = (event) => {
		if (!from.current) return;
		const wanted = from.current.height + (from.current.y - event.clientY);
		setDragged(Math.max(peekPx, Math.min(maxPx, wanted)));
	};

	// TRADE-OFF: a press that never moved still commits — the grip was a toggle before this, and
	// taking that away would cost a gesture people already have
	const finish = () => {
		if (!from.current) return;
		const settled = latest.current;
		const moved = Math.abs(settled - from.current.height) > 2;
		from.current = null;
		setDragged(null);
		onOpen?.(moved ? settled > peekPx + (maxPx - peekPx) * SHEET_COMMIT : !isOpen);
	};

	return h(
		as,
		{
			...rest,
			className: cx("wg-kit-sheet", sidebarClass({ mode, surface }), from.current && "is-dragging", cls),
			style: { ...style, height: `${Math.round(height)}px` },
		},
		[
			<button
				key="grip"
				type="button"
				className="wg-kit-sheet-grip"
				aria-label={grip}
				aria-pressed={String(Boolean(isOpen))}
				onPointerDown={start}
				onPointerMove={move}
				onPointerUp={finish}
				onPointerCancel={finish}
			/>,
			children,
		],
	);
}

export function SidebarGroup({ label, hint, children, className: cls }: LooseProps) {
	return (
		<div className={cx("wg-kit-side-group", cls)}>
			{[
				label ? (
					<span className="wg-kit-side-label" key="label">
						{label}
					</span>
				) : null,
				<List className="wg-kit-side-list" key="list">
					{children}
				</List>,
				hint ? (
					<p className="wg-kit-side-hint" key="hint">
						{hint}
					</p>
				) : null,
			]}
		</div>
	);
}

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
