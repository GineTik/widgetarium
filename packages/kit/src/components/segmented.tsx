import type { LooseProps } from "../types";
import { createElement as h } from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { useSegmentedThumb } from "../hooks/use-segmented-thumb";
import { cx } from "../utils/cx";
import { steppedIndex } from "../utils/roving";

const STEP_OF_KEY = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1, Home: "first", End: "last" };

export function Segmented({
	items,
	value,
	defaultValue,
	onValueChange,
	onChange,
	size = "m",
	className: cls,
}: LooseProps) {
	const [current, setCurrent] = useControllableState({
		prop: value,
		defaultProp: defaultValue ?? items[0]?.value,
		onChange: (next) => {
			onValueChange?.(next);
			onChange?.(next);
		},
	});
	const { listRef, thumbProps } = useSegmentedThumb(current, items);

	const moveWithKeys = (event) => {
		const step = STEP_OF_KEY[event.key];
		if (step === undefined) return;
		event.preventDefault();
		const next = steppedIndex(
			items.findIndex((item) => item.value === current),
			step,
			items.length,
		);
		setCurrent(items[next].value);
		listRef.current?.querySelectorAll('[role="tab"]')[next]?.focus();
	};

	return (
		<div
			className={cx("wg-kit-seg", size === "l" && "is-l", size === "s" && "is-s", cls)}
			ref={listRef}
			role="tablist"
			aria-orientation="horizontal"
			data-orientation="horizontal"
			onKeyDown={moveWithKeys}
		>
			<span {...thumbProps} />
			{items.map((item) => {
				const isActive = item.value === current;
				return (
					<button
						type="button"
						key={item.value}
						role="tab"
						aria-selected={String(isActive)}
						data-state={isActive ? "active" : "inactive"}
						tabIndex={isActive ? 0 : -1}
						onClick={() => setCurrent(item.value)}
					>
						{item.label}
					</button>
				);
			})}
		</div>
	);
}

export const Tabs = Segmented;
