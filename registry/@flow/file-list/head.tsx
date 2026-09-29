import { Count } from "widgetarium/kit";
import { textOf } from "./text-of";

export function Head({ heading, total }: { heading: string; total: number }) {
	const said = textOf(heading);
	return (
		<div className="ffl-head">
			{said === null ? null : <span className="ffl-title">{said}</span>}
			<Count>{total}</Count>
		</div>
	);
}
