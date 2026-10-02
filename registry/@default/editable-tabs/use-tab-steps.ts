import { useEffect, useState } from "react";
import type { DrawnProps, TabStep } from "widgetarium";
import { patchOf } from "./patch-of";
import { ARCHIVED_AT } from "./tab-fields";
import type { TabRow } from "./tab-rows";
import type { EditableTabsWidget } from "./widget";

const CANNOT_ADD = "This list does not take new tabs, so nothing was added.";
const CANNOT_RENAME = "This list cannot be written here, so the name stayed as it was.";
const CANNOT_ARCHIVE = "This list cannot be written here, so the tab stayed where it was.";
const CANNOT_DELETE = "This list does not drop records, so the tab is still here.";

type TabsProps = DrawnProps<typeof EditableTabsWidget.declared>;
type TabWrites = Pick<TabsProps, "createTab" | "updateTab" | "removeTab" | "select" | "host"> & { label: string };

export function useTabSteps(
	rows: TabRow[],
	{ label, createTab, updateTab, removeTab, select: selectRef, host }: TabWrites,
) {
	const [createdName, setCreatedName] = useState<string | null>(null);

	const rowNamed = (name: string) => rows.find((row) => row.label === name) ?? null;
	const created = createdName === null ? null : rowNamed(createdName);
	useEffect(() => {
		if (!created) return;
		setCreatedName(null);
		void selectRef(created.ref);
	}, [created?.ref]);

	const refuse = (said: string) => host?.ui?.notify(said);
	const select = (name: string) => {
		const row = rowNamed(name);
		if (row) void selectRef(row.ref);
	};

	const add = async (name: string) => {
		if (!createTab.can().can) return refuse(CANNOT_ADD);
		const made = await createTab({ id: crypto.randomUUID(), ...patchOf(label, name) });
		if (made.ok) setCreatedName(name);
	};

	const rename = async (was: string, name: string) => {
		const row = rowNamed(was);
		if (!row) return;
		if (!updateTab.can().can) return refuse(CANNOT_RENAME);
		await updateTab({ ref: row.ref, ...patchOf(label, name) });
	};

	const archive = async (name: string, at: string | null) => {
		const row = rowNamed(name);
		if (!row) return;
		if (!updateTab.can().can) return refuse(CANNOT_ARCHIVE);
		await updateTab({ ref: row.ref, props: { [ARCHIVED_AT]: at } });
	};

	const remove = async (name: string) => {
		const row = rowNamed(name);
		if (!row) return;
		if (!removeTab.can().can) return refuse(CANNOT_DELETE);
		await removeTab({ ref: row.ref });
	};

	return async (step: TabStep) => {
		if (step.verb === "select") return select(step.selected ?? "");
		if (step.verb === "add") return add(step.name ?? "");
		if (step.verb === "rename") return rename(step.was ?? "", step.name ?? "");
		if (step.verb === "restore") return archive(step.name ?? "", null);
		if (step.verb === "delete") return remove(step.name ?? "");
		if (step.verb !== "archive") return;
		select(step.selected ?? "");
		await archive(step.name ?? "", new Date().toISOString());
		if (!rowNamed(step.selected ?? "")) await add(step.selected ?? "");
	};
}
