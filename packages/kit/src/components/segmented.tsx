import { createElement as h } from "react";
import type { Key, KeyboardEvent, ReactElement, ReactNode } from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { useSegmentedThumb } from "../hooks/use-segmented-thumb";
import { cn } from "../utils/cn";
import { isFocusable } from "../utils/dom-nodes";
import { stepIndex } from "../utils/roving";
import type { Step } from "../utils/roving";

export interface SegmentedItem<V extends Key> {
	readonly value: V;
	readonly label: ReactNode;
}

export interface SegmentedProps<V extends Key> {
	readonly items: readonly SegmentedItem<V>[];
	readonly value?: V | undefined;
	readonly defaultValue?: V | undefined;
	readonly onValueChange?: ((value: V) => void) | undefined;
	readonly onChange?: ((value: V) => void) | undefined;
	readonly size?: "s" | "m" | "l";
	readonly className?: string | undefined;
}

const STEP_OF_KEY: ReadonlyMap<string, Step> = new Map<string, Step>([
	["ArrowRight", 1],
	["ArrowDown", 1],
	["ArrowLeft", -1],
	["ArrowUp", -1],
	["Home", "first"],
	["End", "last"],
]);

export function Segmented<V extends Key>({
	items,
	value,
	defaultValue,
	onValueChange,
	onChange,
	size = "m",
	className: cls,
}: SegmentedProps<V>): ReactElement {
	const [current, setCurrent] = useControllableState<V | undefined>({
		prop: value,
		defaultProp: defaultValue ?? items[0]?.value,
		onChange: (next) => {
			if (next === undefined) return;
			onValueChange?.(next);
			onChange?.(next);
		},
	});
	const { listRef, thumbProps } = useSegmentedThumb(current, items);

	const moveWithKeys = (event: KeyboardEvent): void => {
		const step = STEP_OF_KEY.get(event.key);
		if (step === undefined) return;
		event.preventDefault();
		const next = stepIndex(
			items.findIndex((item) => item.value === current),
			step,
			items.length,
		);
		const item = items[next];
		if (!item) return;
		setCurrent(item.value);
		const tab = listRef.current?.querySelectorAll('[role="tab"]')[next] ?? null;
		if (isFocusable(tab)) tab.focus();
	};

	return (
		<div
			className={cn("wg-kit-seg", size === "l" && "is-l", size === "s" && "is-s", cls)}
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
						aria-selected={isActive}
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
