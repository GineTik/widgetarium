import { SlotList } from "widgetarium/kit";
import type { Row } from "widgetarium";
import { NoFigureSlot } from "./no-figure-slot";
import type { Figure, FigureSlot } from "./types";

export function Figures({ rows, slot }: { rows: Row<Figure>[]; slot: FigureSlot }) {
	if (rows.length === 0) return null;
	if (!slot) return <NoFigureSlot />;
	return <SlotList slot={slot} rows={rows} keyOf={keyOf} give={give} className="flow-report-figures" />;
}

const keyOf = (row: Row<Figure>) => row.ref;

const give = (row: Row<Figure>) => ({ getSource: row });
