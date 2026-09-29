import { Card } from "widgetarium/kit";
import { Glyph } from "./glyph";

export function RefusedNotice({ isRefused }: { isRefused: boolean }) {
	if (!isRefused) return null;
	return (
		<Card type="group" tone="warning" asChild>
			<p className="otd-refused">
				<Glyph name="alert" />
				Not saved. This would turn the note's first line into its properties.
			</p>
		</Card>
	);
}
