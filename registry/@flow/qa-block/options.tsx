import { Icon } from "widgetarium/kit";
import type { Chip } from "./types";

const MARK_PX = 14;

export function Options({ chips }: { chips: Chip[] }) {
	if (chips.length === 0) return null;
	return (
		<div className="wg-qa-block-options">
			{chips.map((chip, at) => (
				<span
					key={`${chip.label}-${at}`}
					className="wg-qa-block-option"
					data-chosen={chip.isChosen ? "yes" : "no"}
					data-offered={chip.wasOffered ? "yes" : "no"}
				>
					{chip.isChosen ? <Icon name="tick" size={MARK_PX} className="wg-qa-block-mark" /> : null}
					<span className="wg-qa-block-option-label">{chip.label}</span>
				</span>
			))}
		</div>
	);
}
