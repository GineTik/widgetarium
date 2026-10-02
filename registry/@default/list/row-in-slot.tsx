import type { Drawn, Entry, UpdateRow } from "./types";

const QUERY_WORD = "get";
const UPDATE_WORD = "update";

export function RowInSlot({
	Drawn,
	updateRow,
	row,
	givenAs,
}: {
	Drawn: Drawn;
	updateRow: UpdateRow;
	row: Entry;
	givenAs: string;
}) {
	const updateAs = updateNameOf(givenAs);
	const update = (patch: Record<string, unknown>) => updateRow({ ...patch, ref: row.ref });
	return <Drawn {...{ [givenAs]: row, ...(updateAs ? { [updateAs]: update } : {}) }} />;
}

function updateNameOf(givenAs: string): string | null {
	if (!givenAs.startsWith(QUERY_WORD) || givenAs.length === QUERY_WORD.length) return null;
	return UPDATE_WORD + givenAs.slice(QUERY_WORD.length);
}
