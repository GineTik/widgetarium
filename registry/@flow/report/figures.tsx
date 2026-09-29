import { SlotList } from "widgetarium/kit";
import type { Row } from "widgetarium";
import { FigureItem } from "./figure-item";
import type { Figure, FigureSlot, FiguresGateway } from "./types";

const NO_SLOT = "This report has no widget to draw its figures with.";

export function Figures({ figures, rows, slot }: { figures: FiguresGateway; rows: Row<Figure>[]; slot: FigureSlot }) {
	if (rows.length === 0) return null;
	return slot ? (
		<SlotList slot={slot} className="flow-report-figures">
			{rows.map((row) => (
				<FigureItem key={row.ref} figures={figures} row={row} Drawn={slot} />
			))}
		</SlotList>
	) : (
		<p className="flow-report-said">{NO_SLOT}</p>
	);
}
