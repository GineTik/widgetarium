import { Mounted, type MountEntry } from "widgetarium";
import { Card, LayoutItem } from "widgetarium/kit";

export function Stands({ entry }: { entry: MountEntry }) {
	return entry.surface ? (
		<Card type={entry.surface} className="wg-section-stands">
			<Mounted entry={entry} />
		</Card>
	) : (
		<LayoutItem className="wg-section-stands">
			<Mounted entry={entry} />
		</LayoutItem>
	);
}
