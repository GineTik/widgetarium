import { applyTabStep, archivedOf, createWidget, EditableTabs, movesRows, movesSelection, tabsOf, useData, WidgetRoot } from "widgetarium";
import { Button } from "widgetarium/kit";

const GONE_FOR_GOOD = "The view goes for good, with the widget in it and everything it was set to. This cannot be undone.";

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

function Missing({ entry }) {
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

function Unfilled({ onFill }) {
	return (
		<div className="ovg-empty">
			<b>This view holds no widget yet</b>
			<p className="ovg-empty-note">Pick one and it fills this tab. The name stays yours.</p>
			<Button className="ovg-fill" size="s" variant="accent" onClick={onFill}>
				Add widget
			</Button>
		</div>
	);
}

// CONTEXT: the tile renders one view at a time and sizes nothing — the child gets the whole area
type MountEntry = { name: string; id: string; hidden: boolean; problem: string | null; failure: string | null; render: (() => unknown) | null };

export default createWidget(function OrbiTaskViewGroup({ isTabsShown, selection, mounts, configureMounts, pickWidget }: any) {
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

	const apply = (step) => {
		if (movesSelection(step)) selection.update(step.selected);
		if (movesRows(step)) configureMounts?.("holds", applyTabStep(rows, step));
	};

	const fill = async () => {
		const id = await pickWidget?.({ mode: "mount" });
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

	const body = active.problem === "empty" ? <Unfilled onFill={fill} /> : active.render ? active.render() : <Missing entry={active} />;
	if (!isStriped && active.render) return body;

	return (
		<WidgetRoot className="orbi orbi-view-group ovg-stack">
			<style>{STYLE}</style>
			{strip}
			<div className="ovg-held">{body}</div>
		</WidgetRoot>
	);
});
