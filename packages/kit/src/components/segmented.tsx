import type { LooseProps } from "../types";
import { createElement as h } from "react";
import { useSegmentedThumb } from "../hooks/use-segmented-thumb";
import { cx } from "../utils/cx";

export function Segmented({ items, value, onChange, size = "m", className: cls }: LooseProps) {
	const { listRef, thumbProps } = useSegmentedThumb(value, items);

	return (
		<div className={cx("wg-kit-seg", size === "l" && "is-l", size === "s" && "is-s", cls)} ref={listRef} role="tablist">
			<span {...thumbProps} />
			{items.map((item) => (
				<button
					type="button"
					key={item.value}
					role="tab"
					aria-selected={String(item.value === value)}
					onClick={() => onChange?.(item.value)}
				>
					{item.label}
				</button>
			))}
		</div>
	);
}

export const Tabs = Segmented;
