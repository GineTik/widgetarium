// CONTEXT: one law over rows; a storage supplies only read() and write(rows, selected)
// CONTEXT: a row is { name, hidden? } plus whatever its storage keeps — a widget id, a path, an id

export function tabsOf(rows) {
	return (rows ?? []).filter((row) => !row.hidden).map((row) => row.name);
}

export function archivedOf(rows) {
	return (rows ?? []).filter((row) => row.hidden).map((row) => row.name);
}

export function rowNamed(rows, name) {
	return (rows ?? []).find((row) => row.name === name) ?? null;
}

// CONTEXT: `was` rides on the renamed row — a storage keyed by name needs both to move a record
function renamedTo(row, name) {
	return { ...row, name, was: row.name };
}

// CONTEXT: the strip hands back the whole strip; only the row the verb names may change
export function applyTabStep(rows, step) {
	const held = rows ?? [];
	if (step.verb === "add") return [...held, { name: step.name }];
	if (step.verb === "rename") return held.map((row) => (row.name === step.was ? renamedTo(row, step.name) : row));
	if (step.verb === "archive") {
		const left = held.map((row) => (row.name === step.name ? { ...row, hidden: true } : row));
		// CONTEXT: the strip is never empty — the last tab out is replaced by the one the step names
		return tabsOf(left).length > 0 ? left : [...left, { name: step.selected }];
	}
	if (step.verb === "restore") return held.map((row) => (row.name === step.name ? { ...row, hidden: false } : row));
	if (step.verb === "delete") return held.filter((row) => row.name !== step.name);
	return held;
}

export function movesRows(step) {
	return step.verb !== "select";
}

// CONTEXT: restoring and deleting touch the archive, never what is on screen
const MOVES_SELECTION = ["add", "rename", "archive", "select"];

export function movesSelection(step) {
	return MOVES_SELECTION.includes(step.verb);
}
