export type TabVerb = "add" | "rename" | "archive" | "restore" | "delete" | "select";

export interface TabStep {
	readonly verb: TabVerb;
	readonly tabs: readonly string[];
	readonly archived: readonly string[];
	readonly selected: string;
	readonly name: string;
	readonly was: string | null;
}

export interface TabRow {
	readonly name: string;
	readonly hidden?: boolean;
	readonly was?: string;
}

type HeldRows<Row> = readonly Row[] | null | undefined;

const VERBS_MOVING_SELECTION: readonly TabVerb[] = ["add", "rename", "archive", "select"];

export function tabsOf(rows: HeldRows<TabRow>): string[] {
	return (rows ?? []).filter((row) => !row.hidden).map((row) => row.name);
}

export function archivedOf(rows: HeldRows<TabRow>): string[] {
	return (rows ?? []).filter((row) => row.hidden).map((row) => row.name);
}

export function applyTabStep<Row extends TabRow>(rows: HeldRows<Row>, step: TabStep): readonly (Row | TabRow)[] {
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

export function movesRows(step: TabStep): boolean {
	return step.verb !== "select";
}

export function movesSelection(step: TabStep): boolean {
	return VERBS_MOVING_SELECTION.includes(step.verb);
}

function renamedKeepingWas<Row extends TabRow>(row: Row, name: string): Row {
	return { ...row, name, was: row.name };
}
