import { Flame } from "widgetarium/kit";
import { filled } from "./filled";
import type { DayColumn } from "./types";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const A_KEPT_DAY = "{date}, kept";
const AN_OPEN_DAY = "{date}, not kept";

export function DayButton({ column, onPress }: { column: DayColumn; onPress: () => void }) {
	return (
		<button
			type="button"
			className="hs-day"
			disabled={!column.canPress}
			aria-pressed={column.kept}
			aria-label={filled(column.kept ? A_KEPT_DAY : AN_OPEN_DAY, { date: column.day })}
			onClick={onPress}
		>
			<span className="hs-head">
				<span className="hs-name">{weekdayOf(column.day)}</span>
				<span className="hs-date">{Number(column.day.slice(8))}</span>
			</span>
			<span className={column.seat}>
				<span className={column.ring}>{column.kept ? <Flame size={22} className="hs-flame" /> : null}</span>
			</span>
		</button>
	);
}

function weekdayOf(iso: string) {
	return WEEKDAYS[new Date(Date.parse(`${iso}T00:00:00Z`)).getUTCDay()];
}
