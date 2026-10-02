import {
	EditableTabs,
	ICommand,
	IHost,
	IQuery,
	RecordRefSchema,
	VaultRecordSchema,
	createWidget,
	defineLayout,
	defineMetadata,
	useData,
	z,
} from "widgetarium";
import { type TabRow, tabRowsOf } from "./tab-rows";
import { useTabSteps } from "./use-tab-steps";

const ALL_TABS = 200;

const GONE_FOR_GOOD =
	"The tab and the record behind it go to the trash. Notes filed under it keep the value they carry.";

const TabRecord = VaultRecordSchema.partial().extend({
	board: z.string().optional(),
	archivedAt: z.string().nullable().optional(),
});

export const EditableTabsWidget = createWidget({
	inject: {
		getTabs: IQuery.expects(z.array(TabRecord)),
		createTab: ICommand.sends(TabRecord.extend({ id: z.uuid() })),
		updateTab: ICommand.sends(TabRecord.partial().extend({ ref: RecordRefSchema })),
		removeTab: ICommand.sends(z.object({ ref: RecordRefSchema })),
		getLabel: IQuery.expects(z.string().default("name")),
		getValue: IQuery.expects(z.string().default("board")),
		getSelection: IQuery.expects(z.unknown()),
		select: ICommand.sends(z.unknown()),
		host: IHost,
	},
	draw: ({
		getTabs,
		createTab,
		updateTab,
		removeTab,
		getLabel: label,
		getValue: value,
		getSelection: selection,
		select,
		host,
	}) => {
		const listed = useData(getTabs, { limit: ALL_TABS });
		const rows = tabRowsOf(listed.data, label, value);
		const apply = useTabSteps(rows, { label, createTab, updateTab, removeTab, select, host });

		const shown = rows.filter((row) => !row.isArchived);
		const archived = rows.filter((row) => row.isArchived).map((row) => row.label);
		const names = shown.map((row) => row.label);
		const isPicked = (row: TabRow) =>
			Array.isArray(selection) ? selection.includes(row.value) : row.value === selection;
		const active = shown.find(isPicked) ?? shown[0] ?? null;

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
		props: { getTabs: { rows: [{ name: "Widgetarium" }, { name: "Marketing Team" }] } },
		shot: { of: "159176842" },
	},
	props: {
		getTabs: {
			label: "Tabs",
			hint: "Every tab is a record. A folder makes each a note; a typed list lives in this tile.",
			aka: ["records", "tabs"],
			describes: {
				name: { label: "Label", type: "text", required: true },
				board: { label: "Value", type: "text" },
				archivedAt: { label: "Archived at", type: "datetime" },
			},
		},
		createTab: {
			label: "Add a tab",
			source: { implementation: "@core/rows-create", fields: { target: "getTabs" } },
		},
		updateTab: {
			label: "Rename or archive a tab",
			source: { implementation: "@core/rows-update", fields: { target: "getTabs" } },
		},
		removeTab: {
			label: "Delete a tab",
			source: { implementation: "@core/rows-remove", fields: { target: "getTabs" } },
		},
		getLabel: {
			label: "Label field",
			hint: "Which field is written on a tab. Without it a note shows its own name.",
			aka: ["label"],
		},
		getValue: {
			label: "Value field",
			hint: "What a tab hands down, and what files a note under it. Without it the label stands in.",
			aka: ["value"],
		},
		getSelection: {
			label: "Selected tab",
			hint: "Which tab is picked, as a box. Bind another widget and the two move together.",
			aka: ["selection"],
			source: {
				implementation: "@core/selection",
				fields: { rows: "getTabs", fieldFrom: "getValue", whenNothingPicked: "first" },
			},
		},
		select: {
			label: "Pick a tab",
			source: { implementation: "@core/value-set", fields: { target: "getSelection" } },
		},
	},
});

export const layout = defineLayout({
	role: "control",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 90, stackBelowPx: 220 },
});

export default EditableTabsWidget;
