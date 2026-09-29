import { Flame } from "widgetarium/kit";
import { Emoji } from "widgetarium/kit/emojis";
import { filled } from "./filled";

const ONE_DAY = "{count} day";
const MANY_DAYS = "{count} days";

export function Summary({ habitName, face, count }: { habitName: string; face: string; count: number }) {
	return (
		<div className="hs-top">
			<div className="hs-title">
				<Emoji name={face} size={18} />
				<span>{habitName}</span>
			</div>
			<div className={`hs-count${count === 0 ? " is-cold" : ""}`}>
				<Flame size={16} className="hs-flame" />
				<span>{filled(count === 1 ? ONE_DAY : MANY_DAYS, { count: String(count) })}</span>
			</div>
		</div>
	);
}
