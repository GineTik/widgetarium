import type { MountEntry } from "widgetarium";
import { Stands } from "./stands";

export function Placed({ held }: { held: readonly MountEntry[] }) {
	return held.length === 0 ? (
		<div className="wg-section-empty">Nothing stands here yet.</div>
	) : (
		<>
			{held
				.filter((entry) => !entry.hidden)
				.map((entry) => (
					<Stands key={entry.name} entry={entry} />
				))}
		</>
	);
}
