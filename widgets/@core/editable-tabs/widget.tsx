import { canDo, createWidget, EditableTabs, fieldOf, textOf, useData, WidgetRoot } from "widgetarium";
import type { CollectionGateway, CreateAction, GetAction, ListAction, RemoveAction, UpdateAction, ValueGateway, ViewHost } from "widgetarium";

const GONE_FOR_GOOD = "The tab and the record behind it go to the trash. Notes filed under it keep the value they carry.";
const CANNOT_ADD = "This list does not take new tabs, so nothing was added.";
const CANNOT_RENAME = "This list cannot be written here, so the name stayed as it was.";
const CANNOT_ARCHIVE = "This list cannot be written here, so the tab stayed where it was.";
const CANNOT_DELETE = "This list does not drop records, so the tab is still here.";

const ARCHIVED_AT = "archivedAt";
const RECORD_ID = "id";
const RECORD_NAME = "name";

type Held = Record<string, unknown> & { props?: Record<string, unknown> };
type TabRow = { ref: string; label: string; value: string; isArchived: boolean };
type Step = { verb: string; name?: string; was?: string; selected?: string };

function patchOf(field: string, value: unknown): Record<string, unknown> {
	return field === RECORD_NAME ? { [field]: value } : { props: { [field]: value } };
}

function identityOf(held: Held | null, field: string, label: string): string {
	return textOf(held, field) || textOf(held, RECORD_ID) || label;
}

type Accesses = {
	list: ListAction;
	create?: CreateAction;
	update?: UpdateAction;
	remove?: RemoveAction;
};

type EditableTabsProps = {
	tabs: CollectionGateway<Held, Accesses>;
	label: ValueGateway<string>;
	value: ValueGateway<string>;
	selection: ValueGateway<unknown, { get: GetAction; update: UpdateAction }>;
	host?: ViewHost;
};

export default createWidget(function EditableTabsWidget({ tabs, label, value, selection, host }: EditableTabsProps) {
	const labelField = String(useData(label.get).data ?? "");
	const key = String(useData(value.get).data ?? "");
	const chosen = useData(selection.get).data;
	const listed = useData(tabs.list);

	const rows: TabRow[] = listed.rows.map(({ ref, value: held }: { ref: string; value: Held }) => {
		const drawn = textOf(held, labelField);
		return { ref, label: drawn, value: identityOf(held, key, drawn), isArchived: Boolean(fieldOf(held, ARCHIVED_AT)) };
	});
	const shown = rows.filter((row) => !row.isArchived);
	const archived = rows.filter((row) => row.isArchived).map((row) => row.label);
	const names = shown.map((row) => row.label);
	const isPicked = (row: TabRow) => (Array.isArray(chosen) ? chosen.includes(row.value) : row.value === chosen);
	const active = shown.find(isPicked) ?? shown[0] ?? null;

	const rowNamed = (name: string) => rows.find((row) => row.label === name) ?? null;
	const refuse = (said: string) => host?.ui?.notify(said);
	const select = (name: string) => {
		const row = rowNamed(name);
		if (row) selection.update(row.ref);
	};

	const add = async (name: string) => {
		if (!canDo(tabs.create)) return refuse(CANNOT_ADD);
		const made = await tabs.create(patchOf(labelField, name));
		if (made?.ref) selection.update(made.ref);
	};

	const rename = async (was: string, name: string) => {
		const row = rowNamed(was);
		if (!row) return;
		if (!canDo(tabs.update)) return refuse(CANNOT_RENAME);
		await tabs.update({ ref: row.ref, data: patchOf(labelField, name) });
	};

	const archive = async (name: string, at: string | null) => {
		const row = rowNamed(name);
		if (!row) return;
		if (!canDo(tabs.update)) return refuse(CANNOT_ARCHIVE);
		await tabs.update({ ref: row.ref, data: { props: { [ARCHIVED_AT]: at } } });
	};

	const remove = async (name: string) => {
		const row = rowNamed(name);
		if (!row) return;
		if (!canDo(tabs.remove)) return refuse(CANNOT_DELETE);
		await tabs.remove(row.ref);
	};

	const apply = async (step: Step) => {
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

	return (
		<WidgetRoot defaultBackgroundType="none">
			<EditableTabs
				tabs={names}
				archived={archived}
				selected={active?.label ?? ""}
				onChange={apply}
				onRefuse={(said: string) => host?.ui?.notify(said)}
				deleteWarning={GONE_FOR_GOOD}
			/>
		</WidgetRoot>
	);
}, {
	props: {
		tabs: {
			label: "Tabs",
			hint: "Every tab is a record. A folder makes each a note; a typed list lives in this tile.",
			was: "records",
			item: {
				fields: [
					{ key: "name", label: "Label", type: "text", required: true },
					{ key: "board", label: "Value", type: "text" },
					{ key: "archivedAt", label: "Archived at", type: "datetime" },
				],
			},
			default: { path: "Orbitask/Boards" },
		},
		label: {
			type: "text",
			label: "Label field",
			hint: "Which field is written on a tab. Without it a note shows its own name.",
			default: { value: "name" },
		},
		value: {
			type: "text",
			label: "Value field",
			hint: "What a tab hands down, and what files a note under it. Without it the label stands in.",
			default: { value: "board" },
		},
		selection: {
			label: "Selected tab",
			hint: "Which tab is picked, as a box. Bind another widget and the two move together.",
			of: "tabs",
			fieldFrom: "value",
			fallback: "first",
		},
	},
});
