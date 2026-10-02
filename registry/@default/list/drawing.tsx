import { SlotList } from "widgetarium/kit";
import { Pick } from "./pick";
import { RowInSlot } from "./row-in-slot";
import type { Drawn, Entry, Reading, UpdateRow } from "./types";

type DrawingProps = {
	updateRow: UpdateRow;
	Drawn: Drawn;
	page: Reading;
	givenAs: string;
	picked: string;
	onPick: ((ref: string) => void) | null;
};

export function Drawing({ updateRow, Drawn, page, givenAs, picked, onPick }: DrawingProps) {
	return (
		<div className="wg-list-body">
			<SlotList slot={Drawn}>
				{(page.data as Entry[]).map((row) => (
					<Pick
						key={String(row.ref)}
						isPicked={String(row.ref) === picked}
						onPick={onPick === null ? null : () => onPick(String(row.ref))}
					>
						<RowInSlot Drawn={Drawn} updateRow={updateRow} row={row} givenAs={givenAs} />
					</Pick>
				))}
			</SlotList>
		</div>
	);
}
