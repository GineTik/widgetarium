import type { Navigation } from "widgetarium";
import { CELL, PITCH, WEEK } from "./grid-geometry";
import type { DayTotal } from "./types";

type DayCellProps = {
	iso: string;
	at: number;
	total: DayTotal | undefined;
	top: number;
	cornerRadius: number;
	isToday: boolean;
	navigator: Navigation;
};

export function DayCell({ iso, at, total, top, cornerRadius, isToday, navigator }: DayCellProps) {
	const value = total?.value ?? 0;
	const step = stepOf(value, top);
	return (
		<rect
			className={cellMarksOf(step, isToday)}
			x={Math.floor(at / WEEK) * PITCH}
			y={(at % WEEK) * PITCH}
			width={CELL}
			height={CELL}
			rx={cornerRadius}
			fillOpacity={step > 0 ? 0.25 + step * 0.1875 : undefined}
			onClick={total && (() => navigator?.navigate?.(total.path))}
		>
			<title>{`${iso} — ${value || "nothing"}`}</title>
		</rect>
	);
}

function stepOf(value: number, top: number): number {
	if (value <= 0) return 0;
	return Math.min(4, Math.ceil((value / Math.max(top, 1)) * 4));
}

function cellMarksOf(step: number, isToday: boolean): string {
	return ["hh-cell", step > 0 && "is-done", isToday && "is-today"].filter(Boolean).join(" ");
}
