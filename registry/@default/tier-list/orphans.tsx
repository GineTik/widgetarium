import { Button, ButtonLabel, Count, Icon } from "widgetarium/kit";
import { Card } from "./card";
import type { CardRow, Picking } from "./types";

const ORPHANS_SAID = "Filed under a row that is gone";
const ORPHANS_ACTION = "Put them in the tray";

export function Orphans({
	rows,
	drag,
	picked,
	onPressCard,
	onEditCard,
	onUnorphan,
}: Omit<Picking, "onPlace"> & { rows: CardRow[]; onUnorphan: (() => void) | null }) {
	return (
		<div className="wr-orphans">
			<div className="wr-orphan-head">
				<Icon name="archive" size={13} />
				{ORPHANS_SAID}
				<Count>{rows.length}</Count>
				{onUnorphan ? (
					<Button size="s" variant="plain" onClick={onUnorphan}>
						<ButtonLabel>{ORPHANS_ACTION}</ButtonLabel>
					</Button>
				) : null}
			</div>
			<div className="wr-tray-row">
				{rows.map((row) => (
					<Card
						key={row.ref}
						row={row}
						drag={drag}
						isPicked={picked === row.ref}
						onPress={onPressCard}
						onEdit={onEditCard}
					/>
				))}
			</div>
		</div>
	);
}
