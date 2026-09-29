import {
	type TabStep,
	ICrudGateway,
	EditableTabs,
	IHost,
	IValueGateway,
	VaultRecordSchema,
	canDo,
	createWidget,
	defineLayout,
	defineMetadata,
	fieldOf,
	textOf,
	useData,
	z,
	type RecordRef,
} from "widgetarium";

const ALL_TABS = 200;

const GONE_FOR_GOOD =
	"The tab and the record behind it go to the trash. Notes filed under it keep the value they carry.";
const CANNOT_ADD = "This list does not take new tabs, so nothing was added.";
const CANNOT_RENAME = "This list cannot be written here, so the name stayed as it was.";
const CANNOT_ARCHIVE = "This list cannot be written here, so the tab stayed where it was.";
const CANNOT_DELETE = "This list does not drop records, so the tab is still here.";

const ARCHIVED_AT = "archivedAt";
const RECORD_ID = "id";
const RECORD_NAME = "name";

type TabRow = { ref: RecordRef; label: string; value: string; isArchived: boolean };
function patchOf(field: string, value: unknown): Record<string, unknown> {
	return field === RECORD_NAME ? { [field]: value } : { props: { [field]: value } };
}

function identityOf(held: unknown, field: string, label: string): string {
	return textOf(held, field) || textOf(held, RECORD_ID) || label;
}

const TabRecord = VaultRecordSchema.partial().extend({
	board: z.string().optional(),
	archivedAt: z.string().nullable().optional(),
});

const EditableTabsWidget = createWidget({
	inject: {
		tabs: ICrudGateway.of(TabRecord),
		label: IValueGateway.of(z.string().default("name")).pick("get"),
		value: IValueGateway.of(z.string().default("board")).pick("get"),
		selection: IValueGateway.of(z.unknown()).pick("get", "update"),
		host: IHost,
	},
	draw: ({ tabs, label, value, selection, host }) => {
		const listed = useData(tabs.list, { limit: ALL_TABS });

		const rows: TabRow[] = listed.data.map((held) => {
			const drawn = textOf(held, label);
			return {
				ref: held.ref,
				label: drawn,
				value: identityOf(held, value, drawn),
				isArchived: Boolean(fieldOf(held, ARCHIVED_AT)),
			};
		});
		const shown = rows.filter((row) => !row.isArchived);
		const archived = rows.filter((row) => row.isArchived).map((row) => row.label);
		const names = shown.map((row) => row.label);
		const isPicked = (row: TabRow) =>
			Array.isArray(selection.value) ? selection.value.includes(row.value) : row.value === selection.value;
		const active = shown.find(isPicked) ?? shown[0] ?? null;

		const rowNamed = (name: string) => rows.find((row) => row.label === name) ?? null;
		const refuse = (said: string) => host?.ui?.notify(said);
		const select = (name: string) => {
			const row = rowNamed(name);
			if (row) selection.update(row.ref);
		};

		const add = async (name: string) => {
			if (!canDo(tabs.create)) return refuse(CANNOT_ADD);
			const made = await tabs.create(patchOf(label, name));
			if (made?.ref) selection.update(made.ref);
		};

		const rename = async (was: string, name: string) => {
			const row = rowNamed(was);
			if (!row) return;
			if (!canDo(tabs.update)) return refuse(CANNOT_RENAME);
			await tabs.update({ ref: row.ref, data: patchOf(label, name) });
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

		const apply = async (step: TabStep) => {
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
			<div>
				<EditableTabs
					tabs={names}
					archived={archived}
					selected={active?.label ?? ""}
					onChange={apply}
					onRefuse={(said: string) => host?.ui?.notify(said)}
					deleteWarning={GONE_FOR_GOOD}
				/>
			</div>
		);
	},
});

export const metadata = defineMetadata(EditableTabsWidget, {
	title: "Editable tabs",
	description: "A row of tabs you can rename, add to and archive; every widget under it reads the one you pick.",
	keywords: [
		"tabs",
		"tab",
		"strip",
		"switch",
		"picker",
		"navigation",
		"bar",
		"select",
		"header",
		"board",
		"project",
		"workspace",
	],
	preview: {
		size: { w: 5, h: 1 },
		props: { tabs: { rows: [{ name: "Widgetarium" }, { name: "Marketing Team" }] } },
		shot: { of: "159176842" },
	},
	props: {
		tabs: {
			label: "Tabs",
			hint: "Every tab is a record. A folder makes each a note; a typed list lives in this tile.",
			aka: ["records"],
			describes: {
				name: { label: "Label", type: "text", required: true },
				board: { label: "Value", type: "text" },
				archivedAt: { label: "Archived at", type: "datetime" },
			},
		},
		label: {
			label: "Label field",
			hint: "Which field is written on a tab. Without it a note shows its own name.",
		},
		value: {
			label: "Value field",
			hint: "What a tab hands down, and what files a note under it. Without it the label stands in.",
		},
		selection: {
			label: "Selected tab",
			hint: "Which tab is picked, as a box. Bind another widget and the two move together.",
			source: {
				implementation: "@core/selection",
				fields: { rows: "tabs", fieldFrom: "value", whenNothingPicked: "first" },
			},
		},
	},
});

export const layout = defineLayout({
	role: "control",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 90, stackBelowPx: 220 },
});

export default EditableTabsWidget;
