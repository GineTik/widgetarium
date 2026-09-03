// A BOARD IS A RECORD IN A FILE. Its statuses, which of them are archived and the order they
// sit in belong to the board, not to whichever kanban happened to draw it — a column added on
// one board appeared on every board because "board" was only a name in a comma-joined string.
//
// This module is the domain conclusion and nothing else: a reference in, that board's record out. It
// never writes. A widget that created a file because it was drawn would litter the vault on
// the first note that opens.

export function toTabList(value) {
	if (Array.isArray(value)) return value.map((item) => String(item ?? "").trim()).filter(Boolean);
	return String(value ?? "")
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

// CONTEXT: the title a person typed, the file name until they have
function nameOf(row) {
	return String(row?.props?.title ?? row?.name ?? "");
}

// CONTEXT: id first, name second — a record has an id only after an explicit action
function isRecordOf(row, ref) {
	if (row?.id && row.id === ref) return true;
	return nameOf(row) === ref;
}

function asRef(ref) {
	if (typeof ref === "string") return ref;
	return String(ref?.id ?? ref?.name ?? "");
}

// CONTEXT: nothing on file is not an error — the board answers from what the note still carries
export function readBoardRecord(rows, ref, fallback) {
	const wanted = asRef(ref);
	const found = (rows ?? []).find((row) => isRecordOf(row, wanted));
	const columns = toTabList(found?.props?.columns);
	return {
		name: found ? nameOf(found) : wanted,
		id: found?.id ?? null,
		path: found?.path ?? null,
		isOnFile: Boolean(found),
		columns: columns.length > 0 ? columns : toTabList(fallback?.columns),
		archivedColumns: found ? toTabList(found.props?.archivedColumns) : toTabList(fallback?.archivedColumns),
	};
}

// CONTEXT: the note's map is keyed by board name; yesterday's flat list belonged to whoever displayed it
export function archivedColumnsFor(held, name, displayed) {
	if (Array.isArray(held)) return name === displayed ? toTabList(held) : [];
	return toTabList(held?.[name]);
}

// ONE WRITER for a board's column facts. The record owns them the moment it has a file; a board
// with no file yet still answers from the note, so nothing breaks before the boards are moved.
export function boardWriter(record, boards, legacy) {
	return (patch) => {
		if (record.isOnFile && boards?.update?.can().can) {
			const props = {};
			if (patch.columns) props.columns = toTabList(patch.columns).join(", ");
			if (patch.archivedColumns) props.archivedColumns = toTabList(patch.archivedColumns).join(", ");
			return boards.update({ ref: record.path, data: { props } });
		}
		if (patch.columns) legacy?.columns?.(toTabList(patch.columns));
		if (patch.archivedColumns) legacy?.archivedColumns?.(toTabList(patch.archivedColumns));
		return undefined;
	};
}
