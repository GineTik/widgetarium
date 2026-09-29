import { Icon, IconButton } from "widgetarium/kit";

const MONTHS = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

export function MonthHead({
	shown,
	caption,
	onShift,
}: {
	shown: Date;
	caption: string;
	onShift: (by: number) => void;
}) {
	return (
		<div className="hm-head">
			<IconButton size="s" label="Previous month" onClick={() => onShift(-1)}>
				<Icon name="chevron" size={15} className="hm-flip" />
			</IconButton>
			<span className="hm-mid">
				<span className="hm-title">{`${MONTHS[shown.getMonth()]} ${shown.getFullYear()}`}</span>
				{caption === "" ? null : <span className="hm-note">{caption}</span>}
			</span>
			<IconButton size="s" label="Next month" onClick={() => onShift(1)}>
				<Icon name="chevron" size={15} />
			</IconButton>
		</div>
	);
}
