import {
	Fragment,
	createContext,
	createElement as h,
	useCallback,
	useContext,
	useEffect,
	useId,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { PLACEMENTS, PRESS_EVENTS } from "../constants/popover";
import { useControllableState } from "../hooks/use-controllable-state";
import { Icon } from "../icons/icon";
import type { LooseProps } from "../types";
import { cx } from "../utils/cx";
import { enterPanel, exitPanel, prefersReducedMotion, restPanel } from "../utils/popover-motion";
import { steppedIndex } from "../utils/roving";
import { Field } from "./field";
import { Slot } from "./slot";

const PopoverContext = createContext(null);
const ITEM = ".wg-kit-pop-item:not([disabled])";
const CAPTURE_PAST_THE_EDITOR_SHIELD = true;

const stateOf = (isOpen: boolean) => (isOpen ? "open" : "closed");

export function usePopover() {
	const popover = useContext(PopoverContext);
	if (!popover) throw new Error("a popover part stands outside a Popover");
	return popover;
}

export function Popover({
	trigger,
	children,
	open,
	isOpen: openAsLegacy,
	defaultOpen = false,
	onOpenChange,
	className: cls,
	placement = "over",
}: LooseProps) {
	const popover = usePopoverState({ open: open ?? openAsLegacy, defaultOpen, onOpenChange, placement });
	if (trigger === undefined) {
		return (
			<PopoverContext.Provider value={{ ...popover, className: cls }}>
				<span className="wg-kit-anchor" ref={popover.anchorRef} data-state={stateOf(popover.isOpen)}>
					{children}
				</span>
			</PopoverContext.Provider>
		);
	}
	return (
		<PopoverContext.Provider value={{ ...popover, className: cls }}>
			<span
				className="wg-kit-anchor"
				ref={popover.anchorRef}
				aria-expanded={String(popover.isOpen)}
				aria-controls={popover.id}
				data-state={stateOf(popover.isOpen)}
				onClick={(event) => {
					if (popover.panelRef.current?.contains(event.target)) return;
					popover.setOpen(!popover.isOpen);
				}}
			>
				{trigger}
				<PopoverContent>{children}</PopoverContent>
			</span>
		</PopoverContext.Provider>
	);
}

export function PopoverTrigger({ asChild = false, onClick, children, ...props }: LooseProps) {
	const popover = usePopover();
	const Comp = asChild ? Slot : "button";
	return (
		<Comp
			type={asChild ? undefined : "button"}
			aria-haspopup="dialog"
			aria-expanded={String(popover.isOpen)}
			aria-controls={popover.id}
			data-state={stateOf(popover.isOpen)}
			{...props}
			ref={popover.triggerRef}
			onClick={(event) => {
				onClick?.(event);
				if (event.defaultPrevented) return;
				popover.openedByKeyboard.current = event.detail === 0;
				popover.setOpen(!popover.isOpen);
			}}
		>
			{children}
		</Comp>
	);
}

export function PopoverContent({ children, className: cls }: LooseProps) {
	const popover = usePopover();
	const held = useRef(null);
	if (popover.isOpen) held.current = children;
	return (
		<div
			id={popover.id}
			ref={popover.panelRef}
			className={cx(
				"wg-kit-pop",
				popover.where.panelClass,
				(popover.isOpen || popover.isExiting) && "is-open",
				popover.isExiting && "is-exiting",
				popover.className,
				cls,
			)}
			role="dialog"
			data-state={stateOf(popover.isOpen)}
			data-side={popover.placement}
			data-wg-overlay={popover.shown ? "" : undefined}
			onKeyDown={moveBetweenItems}
		>
			<div className="wg-kit-pop-inner">{popover.shown ? held.current : null}</div>
		</div>
	);
}

function moveBetweenItems(event) {
	const step = { ArrowDown: 1, ArrowUp: -1, Home: "first", End: "last" }[event.key];
	if (step === undefined) return;
	const items = [...event.currentTarget.querySelectorAll(ITEM)];
	if (items.length === 0) return;
	event.preventDefault();
	items[steppedIndex(items.indexOf(document.activeElement), step, items.length)].focus();
}

function usePopoverState({ open, defaultOpen, onOpenChange, placement }) {
	const where = PLACEMENTS[placement] ?? PLACEMENTS.over;
	const [isOpen, setOpen] = useControllableState({ prop: open, defaultProp: defaultOpen, onChange: onOpenChange });
	const anchorRef = useRef(null);
	const panelRef = useRef(null);
	const triggerRef = useRef(null);
	const openedByKeyboard = useRef(false);
	const id = useId();

	const [isExiting, setExiting] = useState(false);
	const wasOpen = useRef(false);
	const stopExit = useRef(null);
	const shown = isOpen || isExiting || wasOpen.current;

	useLayoutEffect(() => {
		const panel = panelRef.current;
		const anchor = anchorRef.current;
		if (!panel || !anchor) return;
		const closing = wasOpen.current && !isOpen;
		wasOpen.current = isOpen;
		stopExit.current?.();
		stopExit.current = null;
		if (closing) returnFocus(panel, triggerRef.current ?? anchor);

		if (isOpen) {
			setExiting(false);
			const stopEnter = enterPanel(panel, anchor, where);
			if (openedByKeyboard.current) panel.querySelector(ITEM)?.focus();
			return stopEnter;
		}
		if (!closing || prefersReducedMotion()) {
			setExiting(false);
			restPanel(panel, anchor);
			return;
		}

		setExiting(true);
		stopExit.current = exitPanel(panel, anchor, () => {
			stopExit.current = null;
			setExiting(false);
			restPanel(panel, anchor);
		});
		return () => {
			stopExit.current?.();
			stopExit.current = null;
		};
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen) return;
		const closeOnOutsidePress = (event) => {
			if (panelRef.current?.contains(event.target)) return;
			if (anchorRef.current?.contains(event.target)) return;
			setOpen(false);
		};
		const closeOnEscape = (event) => {
			if (event.key === "Escape") setOpen(false);
		};
		for (const name of PRESS_EVENTS)
			document.addEventListener(name, closeOnOutsidePress, CAPTURE_PAST_THE_EDITOR_SHIELD);
		document.addEventListener("keydown", closeOnEscape, CAPTURE_PAST_THE_EDITOR_SHIELD);
		return () => {
			for (const name of PRESS_EVENTS)
				document.removeEventListener(name, closeOnOutsidePress, CAPTURE_PAST_THE_EDITOR_SHIELD);
			document.removeEventListener("keydown", closeOnEscape, CAPTURE_PAST_THE_EDITOR_SHIELD);
		};
	}, [isOpen, setOpen]);

	return {
		id,
		where,
		placement,
		isOpen,
		isExiting,
		shown,
		setOpen,
		anchorRef,
		panelRef,
		triggerRef,
		openedByKeyboard,
	};
}

function returnFocus(panel, trigger) {
	if (!panel.contains(document.activeElement)) return;
	const target = trigger.matches?.("button, a, input, [tabindex]")
		? trigger
		: trigger.querySelector?.("button, a, input, [tabindex]");
	target?.focus();
}

export function PopoverItem({ checked, sub, children, ...rest }: LooseProps) {
	const [isHighlighted, setHighlighted] = useState(false);
	return (
		<button
			type="button"
			{...rest}
			aria-checked={checked === undefined ? undefined : String(checked)}
			data-state={checked === undefined ? undefined : checked ? "checked" : "unchecked"}
			data-highlighted={isHighlighted ? "" : undefined}
			data-disabled={rest.disabled ? "" : undefined}
			onFocus={(event) => {
				setHighlighted(true);
				rest.onFocus?.(event);
			}}
			onBlur={(event) => {
				setHighlighted(false);
				rest.onBlur?.(event);
			}}
			onPointerEnter={(event) => {
				setHighlighted(true);
				rest.onPointerEnter?.(event);
			}}
			onPointerLeave={(event) => {
				setHighlighted(false);
				rest.onPointerLeave?.(event);
			}}
			className={cx("wg-kit-pop-item", sub && "is-two", rest.className)}
		>
			{sub === undefined ? (
				children
			) : (
				<span className="wg-kit-pop-said">
					{children}
					<span className="wg-kit-pop-sub" key="sub">
						{sub}
					</span>
				</span>
			)}
			{checked === undefined ? null : <Icon name="tick" className="wg-kit-pop-tick" />}
		</button>
	);
}

export function PopoverSeparator(props) {
	return <div {...props} role="separator" className={cx("wg-kit-pop-sep", props.className)} />;
}

export function PopoverSearch({ placeholder, hint, children, className: cls }: LooseProps) {
	const [keyword, setKeyword] = useState("");
	const needle = keyword.trim().toLowerCase();
	const listRef = useRef(null);

	const [reach, setReach] = useState({ up: false, down: false });
	const measureReach = useCallback(() => {
		const list = listRef.current;
		if (!list) return;
		const up = list.scrollTop > 1;
		const down = list.scrollTop + list.clientHeight < list.scrollHeight - 1;
		setReach((was) => (was.up === up && was.down === down ? was : { up, down }));
	}, []);
	useLayoutEffect(measureReach);

	const takeFirst = (event) => {
		if (event.key !== "Enter") return;
		const first = listRef.current?.querySelector(ITEM);
		if (!first) return;
		event.preventDefault();
		first.click();
		setKeyword("");
	};

	return (
		<>
			<div className={cx("wg-kit-pop-search", cls)}>
				<Field
					block={true}
					size="s"
					className="wg-kit-pop-search-field"
					icon={<Icon name="search" />}
					placeholder={placeholder}
					value={keyword}
					onInput={(event) => setKeyword(event.target.value)}
					onKeyDown={takeFirst}
				/>
				{hint ? <span className="wg-kit-pop-search-hint">{hint}</span> : null}
			</div>
			<div className="wg-kit-pop-scroll">
				<div className="wg-kit-pop-list" ref={listRef} onScroll={measureReach}>
					{typeof children === "function" ? children(needle) : children}
				</div>
				{reach.up ? (
					<span className="wg-kit-pop-edge is-up">
						<Icon name="chevron" size={12} />
					</span>
				) : null}
				{reach.down ? (
					<span className="wg-kit-pop-edge is-down">
						<Icon name="chevron" size={12} />
					</span>
				) : null}
			</div>
		</>
	);
}
