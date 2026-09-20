import {
	EditableTabs,
	Mounted,
	applyTabStep,
	archivedOf,
	createWidget,
	defineManifest,
	defineProp,
	movesRows,
	movesSelection,
	tabsOf,
	useData,
} from "widgetarium";
import type { MountEntry, MountRow, WidgetCatalogue } from "widgetarium";
import { Button } from "widgetarium/kit";

const GONE_FOR_GOOD =
	"The view goes for good, with the widget in it and everything it was set to. This cannot be undone.";
const PICK_ONE = "Pick one and it fills this tab. The name stays yours.";
const CATALOGUE_CLOSED = "The widget catalogue is switched off here, so this tab cannot be filled.";

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
	color: var(--text-muted);
}

.ovg-fill { margin-top: var(--size-4-1, 4px); }
`;

function Missing({ entry }: { entry: MountEntry }) {
	return (
		<div className="ovg-empty">
			<b>{entry.problem === "failed" ? "This view failed to load" : "This view is not a widget"}</b>
			<p className="ovg-empty-note">{entry.id}</p>
			<p className="ovg-empty-note">
				{entry.failure ?? "Check the Views setting, or restore the widget folder — the setting is kept either way."}
			</p>
		</div>
	);
}

function Unfilled({ catalogue, onFill }: { catalogue: WidgetCatalogue; onFill: () => void }) {
	return (
		<div className="ovg-empty">
			<b>This view holds no widget yet</b>
			<p className="ovg-empty-note">{catalogue.canOpen ? PICK_ONE : CATALOGUE_CLOSED}</p>
			{catalogue.canOpen ? (
				<Button className="ovg-fill" size="s" variant="accent" onClick={onFill}>
					Add widget
				</Button>
			) : null}
		</div>
	);
}

function viewBody(entry: MountEntry, catalogue: WidgetCatalogue, onFill: () => void) {
	if (!entry.problem) return <Mounted key={entry.name} entry={entry} />;
	if (entry.problem === "empty") return <Unfilled catalogue={catalogue} onFill={onFill} />;
	return <Missing entry={entry} />;
}

function rowOf(entry: MountEntry): MountRow {
	if (!entry.id) return { name: entry.name, hidden: entry.hidden };
	return { name: entry.name, widget: entry.id, hidden: entry.hidden };
}

type Step = { verb: string; name?: string; was?: string; selected?: string };

export const manifest = defineManifest({
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
	role: "detail",
	size: { collapseBelowPx: 240, stackBelowPx: 320 },
	mounts: {
		holds: {
			was: "views",
			label: "Views",
			hint: "Each view is a widget you name. Press a name to rename it.",
			default: [
				{ name: "Kanban", widget: "@default/kanban-board" },
				{ name: "Archived columns", widget: "@default/archived-columns" },
			],
		},
	},
	preview: { size: { w: 4, h: 3 }, shot: { of: "653330514" } },
	props: {
		selection: defineProp<string>()({
			label: "Shown view",
			hint: "Which held widget is drawn. Bind a switcher and the two move together.",
			of: "holds",
			field: "value",
			fallback: "first",
			writes: ["update"],
		}),
		isTabsShown: defineProp<boolean>()({
			label: "Show the tab row",
			design: true,
			default: true,
		}),
	},
});

export default createWidget(manifest, ({ isTabsShown, selection, mounts, configureMounts, catalogue }) => {
	const held: MountEntry[] = mounts?.holds ?? [];
	// CONTEXT: the strip does not own the list — the holds rows are its storage
	const rows = held.map(rowOf);
	const tabs = tabsOf(rows);
	const archived = archivedOf(rows);
	const shown = held.filter((entry) => !entry.hidden);
	const isStriped = useData(isTabsShown.get).data !== false && Boolean(configureMounts);

	const wanted = useData(selection.get).data;
	const asked = shown.find((entry) => entry.name === wanted);
	const active = asked ?? shown[0];

	const apply = (step: Step) => {
		if (movesSelection(step)) selection.update(step.selected ?? "");
		if (movesRows(step)) configureMounts?.("holds", applyTabStep(rows, step));
	};

	const strip = isStriped ? (
		<EditableTabs
			className="ovg-strip"
			tabs={tabs}
			archived={archived}
			selected={active?.name ?? tabs[0]}
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
});
