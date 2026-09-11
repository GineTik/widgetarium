import { applyTabStep, archivedOf, createWidget, EditableTabs, Mounted, movesRows, movesSelection, tabsOf, useData, WidgetRoot } from "widgetarium";
import type { ConfigureMounts, MountEntry, ValueGateway, WidgetCatalogue } from "widgetarium";
import { Button } from "widgetarium/kit";

const GONE_FOR_GOOD = "The view goes for good, with the widget in it and everything it was set to. This cannot be undone.";
const PICK_ONE = "Pick one and it fills this tab. The name stays yours.";
const CATALOGUE_CLOSED = "The widget catalogue is switched off here, so this tab cannot be filled.";

const STYLE = `
.orbi-view-group {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--size-4-4, 16px);
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

type Step = { verb: string; name?: string; was?: string; selected?: string };

type ViewGroupProps = {
	isTabsShown: ValueGateway<boolean>;
	selection: ValueGateway<unknown>;
	mounts?: { holds?: MountEntry[] };
	configureMounts?: ConfigureMounts;
	catalogue: WidgetCatalogue;
};

export default createWidget(function OrbiTaskViewGroup({ isTabsShown, selection, mounts, configureMounts, catalogue }: ViewGroupProps) {
	const held: MountEntry[] = mounts?.holds ?? [];
	// CONTEXT: the strip does not own the list — the holds rows are its storage
	const rows = held.map((entry) => ({ name: entry.name, widget: entry.id, hidden: entry.hidden }));
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

	const fill = async () => {
		const id = await catalogue.open({ mode: "mount" });
		if (!id) return;
		configureMounts?.("holds", rows.map((row) => (row.name === active.name ? { ...row, widget: id } : row)));
	};

	const strip = isStriped
		? (
			<EditableTabs
				className="ovg-strip"
				tabs={tabs}
				archived={archived}
				selected={active?.name ?? tabs[0]}
				onChange={apply}
				deleteWarning={GONE_FOR_GOOD}
			/>
		)
		: null;

	if (!active) {
		return (
			<WidgetRoot className="orbi orbi-view-group ovg-stack">
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
			</WidgetRoot>
		);
	}

	const body = viewBody(active, catalogue, fill);
	if (!isStriped && !active.problem) return body;

	return (
		<WidgetRoot className="orbi orbi-view-group ovg-stack">
			<style>{STYLE}</style>
			{strip}
			<div className="ovg-held">{body}</div>
		</WidgetRoot>
	);
});
