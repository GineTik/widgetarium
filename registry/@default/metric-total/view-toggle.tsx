import { Icon, useSegmentedThumb } from "widgetarium/kit";

// TRADE-OFF: the kit's thumb hook, not its Segmented — an icon-only tab needs its own aria-label
export function ViewToggle({ view, onView }: { view: string; onView: (picked: string) => void }) {
	const at = view === "bars" ? "bars" : "curve";
	const { listRef, thumbProps } = useSegmentedThumb(at, 2);

	return (
		<div className="wg-kit-seg is-s mt3-seg" ref={listRef} role="tablist">
			<span {...thumbProps} />
			<button
				type="button"
				role="tab"
				aria-selected={at === "curve"}
				aria-label="Curve"
				onClick={() => onView("curve")}
			>
				<Icon name="curve" size={16} className="mt3-seg-glyph" />
			</button>
			<button type="button" role="tab" aria-selected={at === "bars"} aria-label="Bars" onClick={() => onView("bars")}>
				<Icon name="bars" size={16} className="mt3-seg-glyph" />
			</button>
		</div>
	);
}
