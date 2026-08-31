import { createWidget, WidgetRoot } from "widgetarium";
import { useEffect } from "react";

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

.ovg-stray {
	margin: 0;
	padding: var(--size-4-2, 8px) var(--size-4-3, 12px);
	font-size: var(--font-ui-small, 14px);
	color: var(--text-muted);
	border-bottom: 1px solid var(--background-modifier-border);
}

.ovg-held {
	flex: 1;
	min-height: 0;
}

.ovg-empty {
	display: flex;
	flex-direction: column;
	gap: var(--size-4-1, 4px);
	max-width: 34ch;
	text-align: center;
}

.ovg-empty-note {
	margin: 0;
	font-size: var(--font-ui-small, 14px);
	color: var(--text-muted);
}
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

// CONTEXT: the tile renders one view at a time and sizes nothing — the child gets the whole area
export default createWidget(function OrbiTaskViewGroup({ context, mounts }) {
	const held = mounts?.holds ?? [];
	// CONTEXT: the switcher reads this instead of authoring a second copy of the same list
	const offered = held.map((entry) => entry.name).join(", ");
	useEffect(() => {
		context?.set("views", offered);
	}, [context, offered]);

	const wanted = context?.get("view");
	const asked = held.find((entry) => entry.name === wanted);
	const active = asked ?? held[0];

	if (!active) {
		return (
			<WidgetRoot className="orbi orbi-view-group">
				<style>{STYLE}</style>
				<div className="ovg-empty">
					<b>This group holds no views</b>
					<p className="ovg-empty-note">
						Add the widgets it should hold in its Views setting, and give each one a name.
					</p>
				</div>
			</WidgetRoot>
		);
	}

	const body = active.render ? active.render() : <Missing entry={active} />;
	// CONTEXT: a selection nothing answers to used to show one name picked and another view drawn
	const strayed = Boolean(wanted) && !asked;
	if (!strayed) return body;

	return (
		<WidgetRoot className="orbi orbi-view-group ovg-stack">
			<style>{STYLE}</style>
			<p className="ovg-stray">
				This group has no view called {wanted} — showing {active.name} instead.
			</p>
			<div className="ovg-held">{body}</div>
		</WidgetRoot>
	);
});
