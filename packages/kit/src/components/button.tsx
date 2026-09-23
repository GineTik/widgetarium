import { Fragment, createElement as h } from "react";
import { Icon } from "../icons/icon";
import type { LooseProps } from "../types";
import { buttonClass, iconButtonClass } from "../utils/class-names";
import { cx } from "../utils/cx";
import { render } from "../utils/render";

export function Button({ isLoading = false, isDone = false, children, ...props }: LooseProps) {
	const mark = buttonMark(isLoading, isDone, props.size);
	const held = {
		type: "button",
		...props,
		disabled: props.disabled || isLoading,
		"aria-busy": isLoading ? "true" : undefined,
		children:
			mark === null ? (
				children
			) : (
				<>
					{mark}
					{children}
				</>
			),
	};
	return render("button", held, cx(buttonClass(props), isLoading && "is-loading", isDone && "is-done"));
}

const MARK_PX = { l: 20, m: 18, s: 16, xs: 14 };

function buttonMark(isLoading, isDone, size) {
	const px = MARK_PX[size] ?? MARK_PX.m;
	if (isDone) return <Icon name="tick" size={px} className="wg-kit-btn-mark" />;
	if (isLoading) return <Spinner size={px} className="wg-kit-btn-mark" />;
	return null;
}

export function IconButton(props) {
	const { label, isLoading = false, isDone = false, children, ...rest } = props;
	const mark = buttonMark(isLoading, isDone, props.size);
	const held = {
		type: "button",
		"aria-label": label,
		...rest,
		disabled: rest.disabled || isLoading,
		"aria-busy": isLoading ? "true" : undefined,
		children: mark ?? children,
	};
	return render("button", held, cx(iconButtonClass(props), isLoading && "is-loading", isDone && "is-done"));
}

export function ButtonLabel(props) {
	return render("span", props, cx("wg-kit-btn-label", props.className));
}

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
