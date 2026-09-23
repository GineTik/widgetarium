import { Fragment, createElement as h } from "react";
import { Icon } from "../icons/icon";
import type { LooseProps } from "../types";
import { buttonClass, iconButtonClass } from "../utils/class-names";
import { cx } from "../utils/cx";
import { domPropsOf } from "../utils/dom-props";
import { Slot, Slottable, slotted } from "./slot";

export function Button({ asChild = false, isLoading = false, isDone = false, children, ...props }: LooseProps) {
	const Comp = asChild ? Slot : "button";
	return (
		<Comp
			type={asChild ? undefined : "button"}
			{...domPropsOf(props)}
			disabled={props.disabled || isLoading}
			aria-busy={isLoading ? "true" : undefined}
			data-loading={isLoading ? "" : undefined}
			data-disabled={props.disabled || isLoading ? "" : undefined}
			className={cx(buttonClass(props), isLoading && "is-loading", isDone && "is-done")}
		>
			{buttonMark(isLoading, isDone, props.size)}
			<Slottable>{children}</Slottable>
		</Comp>
	);
}

const MARK_PX = { l: 20, m: 18, s: 16, xs: 14 };

function buttonMark(isLoading, isDone, size) {
	const px = MARK_PX[size] ?? MARK_PX.m;
	if (isDone) return <Icon name="tick" size={px} className="wg-kit-btn-mark" />;
	if (isLoading) return <Spinner size={px} className="wg-kit-btn-mark" />;
	return null;
}

export function IconButton({
	asChild = false,
	label,
	isLoading = false,
	isDone = false,
	children,
	...props
}: LooseProps) {
	const Comp = asChild ? Slot : "button";
	return (
		<Comp
			type={asChild ? undefined : "button"}
			aria-label={label}
			{...domPropsOf(props)}
			disabled={props.disabled || isLoading}
			aria-busy={isLoading ? "true" : undefined}
			data-loading={isLoading ? "" : undefined}
			data-disabled={props.disabled || isLoading ? "" : undefined}
			className={cx(iconButtonClass(props), isLoading && "is-loading", isDone && "is-done")}
		>
			{buttonMark(isLoading, isDone, props.size) ?? <Slottable>{children}</Slottable>}
		</Comp>
	);
}

export const ButtonLabel = slotted("span", (props) => cx("wg-kit-btn-label", props.className), "ButtonLabel");

const ACTION_ICON_PX = 16;

export function ActionButton({ icon, label, className: cls, children, ...rest }: LooseProps) {
	const isMarked = rest.isLoading || rest.isDone;
	const drawnIcon = isMarked ? null : typeof icon === "string" ? <Icon name={icon} size={ACTION_ICON_PX} /> : icon;
	const own = { ...rest, size: "s", className: cx("wg-kit-action", cls) };
	if (!children)
		return (
			<IconButton {...own} label={label}>
				{drawnIcon}
			</IconButton>
		);
	return (
		<Button {...own} aria-label={label}>
			{drawnIcon}
			{children}
		</Button>
	);
}

export function Spinner({ size = 18, className: cls }: LooseProps) {
	return (
		<span className={cx("wg-kit-spinner", cls)} style={{ width: `${size}px`, height: `${size}px` }} aria-hidden="true">
			<svg viewBox="0 0 24 24">
				<circle cx={12} cy={12} r={9} />
			</svg>
		</span>
	);
}

const SHOW_MORE = "Show more";

const SHOW_COUNT_MORE = "Show {count} more";

const LOADING_MORE = "Loading…";

export function ShowMore({ remaining, isLoading = false, onMore, children, className: cls }: LooseProps) {
	if (remaining !== undefined && !(remaining > 0)) return null;
	const said = remaining === undefined ? SHOW_MORE : SHOW_COUNT_MORE.replace("{count}", String(remaining));
	return (
		<Button size="s" block={true} className={cls} disabled={isLoading} onClick={onMore}>
			{isLoading ? LOADING_MORE : (children ?? said)}
		</Button>
	);
}
