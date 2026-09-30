import { Icon, useSegmentedThumb } from "widgetarium/kit";
import type { View } from "./types";

// TRADE-OFF: the kit's thumb hook, not its Segmented — an icon-only tab needs its own aria-label
export function ViewToggle({ view, onView }: { view: View; onView: (picked: View) => void }) {
	const { listRef, thumbProps } = useSegmentedThumb(view, 2);

	return (
		<div className="wg-kit-seg is-s mt3-seg" ref={listRef} role="tablist">
			<span {...thumbProps} />
			<button
				type="button"
				role="tab"
				aria-selected={view === "curve"}
				aria-label="Curve"
				onClick={() => onView("curve")}
			>
				<Icon name="curve" size={16} className="mt3-seg-glyph" />
			</button>
			<button type="button" role="tab" aria-selected={view === "bars"} aria-label="Bars" onClick={() => onView("bars")}>
				<Icon name="bars" size={16} className="mt3-seg-glyph" />
			</button>
		</div>
	);
}
