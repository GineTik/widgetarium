import { Count, Icon } from "widgetarium/kit";
import { Orphans } from "./orphans";
import { Pen } from "./pen";
import { TrayEmpty } from "./tray-empty";
import type { Picking, RackView } from "./types";

export function Tray({
	held,
	onAddCard,
	onPresets,
	onUnorphan,
	...picking
}: Picking & {
	held: RackView;
	onAddCard: (() => void) | null;
	onPresets: (() => void) | null;
	onUnorphan: (() => void) | null;
}) {
	const isEmpty = held.tray.length === 0 && !picking.drag.carry;
	const hasNothing = held.tray.length + held.orphans.length + held.ranked === 0;

	return (
		<div className="wr-tray">
			{held.orphans.length > 0 ? (
				<Orphans
					rows={held.orphans}
					onUnorphan={onUnorphan}
					drag={picking.drag}
					picked={picking.picked}
					onPressCard={picking.onPressCard}
					onEditCard={picking.onEditCard}
				/>
			) : null}

			<div className="wr-tray-head">
				<span className="wr-tray-label">Unranked</span>
				<Count>{held.tray.length}</Count>
			</div>

			<div className="wr-tray-row">
				<Pen
					name={null}
					cards={held.tray}
					{...picking}
					after={
						onAddCard ? (
							<button type="button" className="wr-add-card" aria-label="Add a card" onClick={onAddCard}>
								<Icon name="plus" size={18} />
							</button>
						) : null
					}
				/>
			</div>

			{isEmpty ? <TrayEmpty hasNothing={hasNothing} onAddCard={onAddCard} onPresets={onPresets} /> : null}
		</div>
	);
}
