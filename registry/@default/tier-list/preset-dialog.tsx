import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "widgetarium";
import { toneClass } from "widgetarium/kit";
import { DEFAULT_TIERS, labelOf } from "./tiers";
import { presetsOffered, type Preset } from "./presets";
import { toneOf } from "./tones";

const PRESET_TITLE = "Start from a preset";
const PRESET_SAID = "A preset fills this tile. Nothing is written into the vault, and every card can be put back.";
const PRESET_NEEDS_WEB = "needs the web";

const CARDS_COUNTED = "{count} cards";

export function PresetDialog({
	isOpen,
	onClose,
	onPick,
}: {
	isOpen: boolean;
	onClose: () => void;
	onPick: (preset: Preset) => void;
}) {
	const offered = presetsOffered();
	return (
		<Dialog isOpen={isOpen} onOpenChange={onClose}>
			<DialogContent className="wg-rank" width="40rem">
				<DialogClose />
				<DialogHeader>
					<DialogTitle>{PRESET_TITLE}</DialogTitle>
					<DialogDescription>{PRESET_SAID}</DialogDescription>
				</DialogHeader>
				<div className="wr-gallery">
					{offered.map((preset) => (
						<button type="button" className="wr-preset" key={preset.id} onClick={() => onPick(preset)}>
							<span className="wr-preset-name">{preset.name}</span>
							<span className="wr-preset-mini">
								{DEFAULT_TIERS.map((tier) => (
									<i className={`wr-preset-chip ${toneClass(toneOf(tier))}`} key={labelOf(tier)} />
								))}
							</span>
							<span className="wr-preset-where">
								{CARDS_COUNTED.replace("{count}", String(preset.cards.length))}
								{preset.needsTheWeb ? ` · ${PRESET_NEEDS_WEB}` : ""}
							</span>
						</button>
					))}
				</div>
				{offered
					.filter((preset) => preset.credit)
					.map((preset) => (
						<p className="wr-credit" key={preset.id}>
							{preset.credit}
						</p>
					))}
			</DialogContent>
		</Dialog>
	);
}
