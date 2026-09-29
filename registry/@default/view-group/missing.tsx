import type { MountEntry } from "widgetarium";

export function Missing({ entry }: { entry: MountEntry }) {
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
