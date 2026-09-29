import {
	type TabStep,
	ICatalogue,
	IConfigureMounts,
	EditableTabs,
	Mounted,
	IMounts,
	IValueGateway,
	applyTabStep,
	archivedOf,
	createWidget,
	defineLayout,
	defineMetadata,
	movesRows,
	movesSelection,
	tabsOf,
	z,
} from "widgetarium";
import type { MountEntry, MountRow, WidgetCatalogue } from "widgetarium";
import { Missing } from "./missing";
import { Unfilled } from "./unfilled";

const GONE_FOR_GOOD =
	"The view goes for good, with the widget in it and everything it was set to. This cannot be undone.";

const STYLE = `
.orbi-view-group {
	display: flex;
	align-items: center;
	justify-content: center;
}

.orbi-view-group.ovg-stack {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	justify-content: flex-start;
	gap: var(--size-4-2, 8px);
	padding: 0;
}

.ovg-strip { flex: none; padding: var(--size-4-1, 4px) 0; }


.ovg-held {
	flex: 1;
	min-height: 0;
}

.ovg-empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--size-4-2, 8px);
	max-width: 34ch;
	text-align: center;
}

.ovg-empty-note {
	margin: 0;
	font-size: var(--font-ui-small, 14px);
	color: var(--wg-kit-text-muted);
}

.ovg-fill { margin-top: var(--size-4-1, 4px); }
`;

function viewBody(entry: MountEntry, catalogue: WidgetCatalogue, onFill: () => void) {
	if (!entry.problem) return <Mounted key={entry.name} entry={entry} />;
	if (entry.problem === "empty") return <Unfilled catalogue={catalogue} onFill={onFill} />;
	return <Missing entry={entry} />;
}

function rowOf(entry: MountEntry): MountRow {
	if (!entry.id) return { name: entry.name, hidden: entry.hidden };
	return { name: entry.name, widget: entry.id, hidden: entry.hidden };
}

const ViewGroup = createWidget({
	inject: {
		holds: IMounts.of({
			default: [
				{ name: "Kanban", widget: "@default/kanban-board" },
				{ name: "Archived columns", widget: "@default/archived-columns" },
			],
			was: "views",
		}),
		selection: IValueGateway.of(z.unknown()).pick("get", "update"),
		isTabsShown: IValueGateway.of(z.boolean().default(true)).pick("get"),
		configureMounts: IConfigureMounts,
		catalogue: ICatalogue,
	},
	draw: ({ isTabsShown, selection, holds, configureMounts, catalogue }) => {
		const rows = holds.map(rowOf);
		const tabs = tabsOf(rows);
		const archived = archivedOf(rows);
		const shown = holds.filter((entry) => !entry.hidden);
		const isStriped = isTabsShown && Boolean(configureMounts);

		const asked = shown.find((entry) => entry.name === selection.value);
		const active = asked ?? shown[0];

		const apply = (step: TabStep) => {
			if (movesSelection(step)) selection.update(step.selected ?? "");
			if (movesRows(step)) configureMounts?.("holds", applyTabStep(rows, step));
		};

		const strip = isStriped ? (
			<EditableTabs
				className="ovg-strip"
				tabs={tabs}
				archived={archived}
				selected={active?.name ?? tabs[0] ?? ""}
				onChange={apply}
				deleteWarning={GONE_FOR_GOOD}
			/>
		) : null;

		if (!active) {
			return (
				<div className="orbi orbi-view-group ovg-stack">
					<style>{STYLE}</style>
					{strip}
					<div className="ovg-held orbi-view-group">
						<div className="ovg-empty">
							<b>This group holds no views</b>
							<p className="ovg-empty-note">
								Add the widgets it should hold in its Views setting, and give each one a name.
							</p>
						</div>
					</div>
				</div>
			);
		}

		const fill = async () => {
			const id = await catalogue.open({ mode: "mount" });
			if (!id) return;
			configureMounts?.(
				"holds",
				rows.map((row) => (row.name === active.name ? { ...row, widget: id } : row)),
			);
		};

		const body = viewBody(active, catalogue, fill);
		if (!isStriped && !active.problem) return body;

		return (
			<div className="orbi orbi-view-group ovg-stack">
				<style>{STYLE}</style>
				{strip}
				<div className="ovg-held">{body}</div>
			</div>
		);
	},
});

export const metadata = defineMetadata(ViewGroup, {
	title: "View group",
	description: "Holds several widgets in one place and draws only the one the view tabs select.",
	keywords: [
		"view",
		"views",
		"group",
		"switch",
		"swap",
		"container",
		"holder",
		"stack",
		"panes",
		"tabs",
		"layout",
		"shell",
	],
	preview: { size: { w: 4, h: 3 }, shot: { of: "653330514" } },
	props: {
		holds: {
			label: "Views",
			hint: "Each view is a widget you name. Press a name to rename it.",
		},
		selection: {
			label: "Shown view",
			hint: "Which held widget is drawn. Bind a switcher and the two move together.",
			source: {
				implementation: "@core/selection",
				fields: { rows: "holds", field: "value", whenNothingPicked: "first" },
			},
		},
		isTabsShown: {
			label: "Show the tab row",
			design: true,
		},
	},
});

export const layout = defineLayout({
	role: "detail",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 240, stackBelowPx: 320 },
});

export default ViewGroup;
