import type { WidgetCatalogue } from "widgetarium";
import { Button } from "widgetarium/kit";

const PICK_ONE = "Pick one and it fills this tab. The name stays yours.";
const CATALOGUE_CLOSED = "The widget catalogue is switched off here, so this tab cannot be filled.";

export function Unfilled({ catalogue, onFill }: { catalogue: WidgetCatalogue; onFill: () => void }) {
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
