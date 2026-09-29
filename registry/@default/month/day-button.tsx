import { Flame } from "widgetarium/kit";
import type { DayCell } from "./types";

const A_KEPT_DAY = "{date}, kept";
const AN_OPEN_DAY = "{date}, not kept";

export function DayButton({ cell, flameSize, onPress }: { cell: DayCell; flameSize: number; onPress: () => void }) {
	return (
		<button
			type="button"
			className={`hm-day${cell.isOutside ? " is-outside" : ""}${cell.isAhead ? " is-ahead" : ""}`}
			disabled={!cell.canPress}
			aria-pressed={cell.kept}
			aria-label={fillSentence(cell.kept ? A_KEPT_DAY : AN_OPEN_DAY, { date: cell.day })}
			onClick={onPress}
		>
			<span className="hm-number">{cell.dayOfMonth}</span>
			<span className="hm-seat">
				{cell.run ? <span className={cell.run} /> : null}
				<span className={cell.ring}>{cell.kept ? <Flame size={flameSize} className="hm-flame" /> : null}</span>
			</span>
		</button>
	);
}

function fillSentence(sentence: string, values: Record<string, string>) {
	return Object.entries(values).reduce((held, [name, value]) => held.replace(`{${name}}`, value), sentence);
}
