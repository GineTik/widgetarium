import { cardClass } from "widgetarium/kit";
import { shortDaySaid } from "./days";
import { compactOf } from "./numbers";
import type { Point } from "./types";
import { useWritesOwnSize } from "./use-writes-own-size";

const TIP_AT = "--mt3-tip-at";

export function Tip({ point, unit, left }: { point: Point; unit: string; left: number }) {
	const held = useWritesOwnSize();
	return (
		<div
			ref={held}
			data-part="tip"
			className={`${cardClass({})} mt3-tip`}
			style={{ [TIP_AT]: `${left}px` } as Record<string, string>}
		>
			<div data-part="tip-value" className="mt3-tip-value">{`${compactOf(point.value)} ${unit}`}</div>
			<div data-part="tip-day" className="mt3-tip-day">
				{longDaySaid(point.day)}
			</div>
		</div>
	);
}

function longDaySaid(iso: string): string {
	return `${shortDaySaid(iso)}, ${iso.slice(0, 4)}`;
}
