import { PopoverItem, PopoverSearch } from "widgetarium/kit";
import type { ReactNode } from "react";
import { Glyph } from "./glyph";

type RosterPickerProps = {
	placeholder: string;
	roster: string[];
	isChosen: (entry: string) => boolean;
	onPick: (entry: string) => void;
	label: (entry: string) => ReactNode;
	addLabel: (typed: string) => ReactNode;
};

export function RosterPicker({ placeholder, roster, isChosen, onPick, label, addLabel }: RosterPickerProps) {
	return (
		<PopoverSearch placeholder={placeholder}>
			{(needle: string) => [
				...roster
					.filter((entry) => entry.toLowerCase().includes(needle))
					.map((entry) => (
						<PopoverItem key={entry} checked={isChosen(entry)} onClick={() => onPick(entry)}>
							{label(entry)}
						</PopoverItem>
					)),
				needle !== "" && !roster.some((entry) => entry.toLowerCase() === needle) ? (
					<PopoverItem key="add" onClick={() => onPick(needle)}>
						<Glyph name="plus" />
						{addLabel(needle)}
					</PopoverItem>
				) : null,
			]}
		</PopoverSearch>
	);
}
