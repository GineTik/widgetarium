export function tabsOf(rows) {
	return (rows ?? []).filter((row) => !row.hidden).map((row) => row.name);
}

export function archivedOf(rows) {
	return (rows ?? []).filter((row) => row.hidden).map((row) => row.name);
}

export function rowNamed(rows, name) {
	return (rows ?? []).find((row) => row.name === name) ?? null;
}

export function applyTabStep(rows, step) {
	const held = rows ?? [];
	if (step.verb === "add") return [...held, { name: step.name }];
	if (step.verb === "rename")
		return held.map((row) => (row.name === step.was ? renamedKeepingWas(row, step.name) : row));
	if (step.verb === "archive") {
		const left = held.map((row) => (row.name === step.name ? { ...row, hidden: true } : row));
		return tabsOf(left).length > 0 ? left : [...left, { name: step.selected }];
	}
	if (step.verb === "restore") return held.map((row) => (row.name === step.name ? { ...row, hidden: false } : row));
	if (step.verb === "delete") return held.filter((row) => row.name !== step.name);
	return held;
}

export function movesRows(step) {
	return step.verb !== "select";
}

const VERBS_MOVING_SELECTION = ["add", "rename", "archive", "select"];

export function movesSelection(step) {
	return VERBS_MOVING_SELECTION.includes(step.verb);
}

function renamedKeepingWas(row, name) {
	return { ...row, name, was: row.name };
}
