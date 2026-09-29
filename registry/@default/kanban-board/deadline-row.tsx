import { Calendar, Popover, PopoverItem, PopoverSeparator } from "widgetarium/kit";
import { useState } from "react";
import { Glyph } from "./glyph";
import { MONTHS } from "./months";
import { RowFrame } from "./row-frame";
import { isUnset } from "./task-fields";
import type { Anchor } from "./types";

type DeadlineRowProps = {
	anchor: Anchor;
	name: string;
	value: unknown;
	today: Date;
	onPick: (next: string) => void;
};

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

export function DeadlineRow({ anchor, name, value, today, onPick }: DeadlineRowProps) {
	const [isOpen, setOpen] = useState(false);
	const unset = isUnset(value);

	const shown = unset ? (
		<span className="otd-value is-empty">Empty</span>
	) : (
		<span className="otd-value">
			{fullDateLabel(value)}
			<Glyph name="caret" className="otd-caret" />
		</span>
	);

	const pick = (date: Date | null) => {
		setOpen(false);
		onPick(date === null ? "" : isoOf(date));
	};

	return (
		<Popover
			isOpen={isOpen}
			onOpenChange={setOpen}
			trigger={
				<RowFrame anchor={anchor} name={name} unset={unset} isOpen={isOpen} asButton>
					{shown}
				</RowFrame>
			}
		>
			<Calendar selected={toDate(value) ?? undefined} today={today} onSelect={pick} />
			<PopoverSeparator />
			<PopoverItem onClick={() => pick(today)}>
				Today
				<span className="otd-item-note">{fullDateLabel(isoOf(today))}</span>
			</PopoverItem>
			<PopoverItem onClick={() => pick(nextMonday(today))}>
				Next Monday
				<span className="otd-item-note">{fullDateLabel(isoOf(nextMonday(today)))}</span>
			</PopoverItem>
			<PopoverSeparator />
			<PopoverItem onClick={() => pick(null)}>
				<Glyph name="close" />
				Clear
			</PopoverItem>
		</Popover>
	);
}

// TRADE-OFF: only ISO parses — anything else is shown verbatim rather than reinterpreted
function toDate(value: unknown): Date | null {
	if (value instanceof Date) return value;
	const found = ISO_DATE.exec(String(value ?? ""));
	if (!found) return null;
	return new Date(Number(found[1]), Number(found[2]) - 1, Number(found[3]));
}

function isoOf(date: Date): string {
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${date.getFullYear()}-${month}-${day}`;
}

function fullDateLabel(value: unknown): string {
	const date = toDate(value);
	if (!date) return String(value ?? "");
	return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function nextMonday(today: Date): Date {
	const ahead = (8 - today.getDay()) % 7 || 7;
	return new Date(today.getFullYear(), today.getMonth(), today.getDate() + ahead);
}
