import { Icon, toneClass, useScrollFog } from "widgetarium/kit";
import { useRef } from "react";
import { Grip } from "./grip";
import { Pen } from "./pen";
import type { Picking, RackView, TierRow } from "./types";

const FOG_REACH_PX = 24;
const NO_ROWS = "No rows yet. Everything sits in the tray until there is somewhere to put it.";

export function Rack({
	held,
	onNameRow,
	onMoveRow,
	onRemoveRow,
	onAddRow,
	...picking
}: Picking & {
	held: RackView;
	onNameRow: (row: TierRow) => void;
	onMoveRow: (row: TierRow, step: number) => void;
	onRemoveRow: (row: TierRow) => void;
	onAddRow: (() => void) | null;
}) {
	const rackRef = useRef<HTMLDivElement | null>(null);
	const fogRef = useRef<HTMLDivElement | null>(null);
	useScrollFog(rackRef, (edges: { top: number; bottom: number }) => paintFog(fogRef.current, edges));
	const isEmpty = held.rack.length === 0;

	const addRow = onAddRow ? (
		<button type="button" className="wr-add-tier" onClick={onAddRow}>
			<Icon name="plus" size={14} />
			Add a row
		</button>
	) : null;

	return (
		<div className="wr-fog" ref={fogRef}>
			<div className="wr-rack" ref={rackRef}>
				{isEmpty ? (
					<div className="wr-empty">
						<span className="wr-empty-note">{NO_ROWS}</span>
						{addRow}
					</div>
				) : (
					held.rack.map((line, at) => (
						<div className={`wr-tier ${toneClass(line.tone)}`} key={line.row.ref}>
							<div
								className="wr-rail"
								onClick={() => (picking.picked ? picking.onPlace(line.label) : onNameRow(line.row))}
							>
								<span className="wr-rail-label">{line.label}</span>
								<span className="wr-grips">
									<Grip
										variant="is-up"
										label="Move this row up"
										isOff={at === 0}
										onPress={() => onMoveRow(line.row, -1)}
									/>
									<Grip
										variant="is-down"
										label="Move this row down"
										isTurned
										isOff={at === held.rack.length - 1}
										onPress={() => onMoveRow(line.row, 1)}
									/>
									<Grip variant="is-gone" label="Remove this row" icon="close" onPress={() => onRemoveRow(line.row)} />
								</span>
							</div>
							<Pen name={line.label} cards={line.cards} {...picking} />
						</div>
					))
				)}
				{isEmpty ? null : addRow}
			</div>
		</div>
	);
}

function paintFog(fog: HTMLElement | null, edges: { top: number; bottom: number }) {
	if (!fog) return;
	fog.style.setProperty("--wr-fog-top", String(Math.min(1, edges.top / FOG_REACH_PX)));
	fog.style.setProperty("--wr-fog-bottom", String(Math.min(1, edges.bottom / FOG_REACH_PX)));
}
