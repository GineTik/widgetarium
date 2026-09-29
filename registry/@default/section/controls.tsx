import { Mounted, type MountEntry } from "widgetarium";

export function Controls({ held }: { held: readonly MountEntry[] }) {
	const shown = held.filter((entry) => !entry.hidden && !entry.problem);
	if (shown.length === 0) return null;
	return (
		<div className="wg-section-controls">
			{shown.map((entry) => (
				<Mounted key={entry.name} entry={entry} />
			))}
		</div>
	);
}
