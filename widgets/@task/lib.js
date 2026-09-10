import { fieldOf } from "widgetarium";

function toTabList(value) {
	if (Array.isArray(value)) return value.map((item) => String(item ?? "").trim()).filter(Boolean);
	return String(value ?? "")
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

function namedRows(held) {
	if (typeof held === "string") return toTabList(held).map((name) => ({ name }));
	if (!Array.isArray(held)) return [];
	return held
		.map((entry) => (typeof entry === "string" ? { name: entry } : entry))
		.map((row) => ({ ...row, name: String(row?.name ?? "").trim() }))
		.filter((row) => row.name !== "");
}

export function columnsOf(board) {
	const rows = namedRows(fieldOf(board, "columns"));
	const archivedLongAgo = new Set(toTabList(fieldOf(board, "archivedColumns")));
	const named = new Set(rows.map((row) => row.name));
	const forgotten = [...archivedLongAgo].filter((name) => !named.has(name)).map((name) => ({ name }));
	return [...rows, ...forgotten].map((row) => ({
		name: row.name,
		archivedAt: row.archivedAt ?? null,
		isArchived: Boolean(row.archivedAt) || archivedLongAgo.has(row.name),
	}));
}

export const shownColumnsOf = (columns) => columns.filter((column) => !column.isArchived).map((column) => column.name);

export const archivedColumnsOf = (columns) => columns.filter((column) => column.isArchived).map((column) => column.name);

const archivedStamp = (column) => column.archivedAt ?? new Date().toISOString();

export const archived = (column) => ({ ...column, isArchived: true, archivedAt: archivedStamp(column) });

export const restored = (column) => ({ ...column, isArchived: false, archivedAt: null });

export const columnPatched = (columns, name, step) => columns.map((column) => (column.name === name ? step(column) : column));

// TRADE-OFF: the old key is emptied, not dropped — processFrontMatter merges and cannot delete
export function columnsWritten(columns) {
	return {
		columns: columns.map((column) => (column.isArchived ? { name: column.name, archivedAt: archivedStamp(column) } : { name: column.name })),
		archivedColumns: [],
	};
}

export function propertiesOf(board) {
	return toTabList(fieldOf(board, "properties"));
}
