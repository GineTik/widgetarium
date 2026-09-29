const FROM_MONDAY = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FROM_SUNDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function WeekdayNames({ isWeekStartingMonday }: { isWeekStartingMonday: boolean }) {
	return (
		<div className="hm-weekdays">
			{(isWeekStartingMonday ? FROM_MONDAY : FROM_SUNDAY).map((name) => (
				<span className="hm-weekday" key={name}>
					{name}
				</span>
			))}
		</div>
	);
}
