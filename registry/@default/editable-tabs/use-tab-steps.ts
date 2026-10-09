import type { PropsOf, TabStep } from "widgetarium";
import { patchOf } from "./patch-of";
import { ARCHIVED_AT } from "./tab-fields";
import type { TabRow } from "./tab-rows";
import type { EditableTabsWidget } from "./widget";

const CANNOT_ADD = "This list does not take new tabs, so nothing was added.";
const CANNOT_RENAME = "This list cannot be written here, so the name stayed as it was.";
const CANNOT_ARCHIVE = "This list cannot be written here, so the tab stayed where it was.";
const CANNOT_DELETE = "This list does not drop records, so the tab is still here.";

type TabsProps = PropsOf<typeof EditableTabsWidget>;
type TabWrites = Pick<TabsProps, "createTab" | "updateTab" | "removeTab" | "select" | "host"> & { label: string };

interface TabSteps {
	readonly rows: TabRow[];
	readonly writes: TabWrites;
}

type StepRun = (steps: TabSteps, step: TabStep) => Promise<void> | void;

const STEP_RUNS: Readonly<Record<TabStep["verb"], StepRun>> = {
	select: (steps, step) => selectTab(steps, step.selected ?? ""),
	add: (steps, step) => addTab(steps, step.name ?? ""),
	rename: (steps, step) => renameTab(steps, step.was ?? "", step.name ?? ""),
	restore: (steps, step) => archiveTab(steps, step.name ?? "", null),
	delete: (steps, step) => deleteTab(steps, step.name ?? ""),
	archive: archiveKeepingSelection,
};

export function useTabSteps(rows: TabRow[], writes: TabWrites) {
	return async (step: TabStep) => STEP_RUNS[step.verb]?.({ rows, writes }, step);
}

function rowNamed(rows: TabRow[], name: string): TabRow | null {
	return rows.find((row) => row.label === name) ?? null;
}

function refuse({ writes }: TabSteps, said: string): void {
	writes.host?.ui?.notify(said);
}

function selectTab({ rows, writes }: TabSteps, name: string): void {
	const row = rowNamed(rows, name);
	if (row) void writes.select(row.ref);
}

async function addTab(steps: TabSteps, name: string): Promise<void> {
	const { createTab, label, select } = steps.writes;
	if (!createTab.can().can) return refuse(steps, CANNOT_ADD);
	const made = await createTab({ id: crypto.randomUUID(), ...patchOf(label, name) });
	if (made.ok && made.output) await select(made.output.ref);
}

async function renameTab(steps: TabSteps, was: string, name: string): Promise<void> {
	const { updateTab, label } = steps.writes;
	const row = rowNamed(steps.rows, was);
	if (!row) return;
	if (!updateTab.can().can) return refuse(steps, CANNOT_RENAME);
	await updateTab({ ref: row.ref, ...patchOf(label, name) });
}

async function archiveTab(steps: TabSteps, name: string, at: string | null): Promise<void> {
	const { updateTab } = steps.writes;
	const row = rowNamed(steps.rows, name);
	if (!row) return;
	if (!updateTab.can().can) return refuse(steps, CANNOT_ARCHIVE);
	await updateTab({ ref: row.ref, props: { [ARCHIVED_AT]: at } });
}

async function deleteTab(steps: TabSteps, name: string): Promise<void> {
	const { removeTab } = steps.writes;
	const row = rowNamed(steps.rows, name);
	if (!row) return;
	if (!removeTab.can().can) return refuse(steps, CANNOT_DELETE);
	await removeTab({ ref: row.ref });
}

async function archiveKeepingSelection(steps: TabSteps, step: TabStep): Promise<void> {
	selectTab(steps, step.selected ?? "");
	await archiveTab(steps, step.name ?? "", new Date().toISOString());
	if (!rowNamed(steps.rows, step.selected ?? "")) await addTab(steps, step.selected ?? "");
}
