import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "widgetarium";
import { Button, ButtonLabel, Field, TONE_NAMES, toneClass } from "widgetarium/kit";
import type { TierRow } from "./types";
import { useRowDraft } from "./use-row-draft";

const RENAME_REWRITES =
	"The name is what the cards point at, so renaming this row also rewrites the {count} cards in it.";
const EIGHT_COLOURS = "Eight colours, and they follow the vault's theme. A ninth row repeats one.";

export function RowDialog({
	row,
	heldCards,
	onClose,
	onSave,
}: {
	row: TierRow | null;
	heldCards: number;
	onClose: () => void;
	onSave: (label: string, tone: string) => void;
}) {
	const { label, setLabel, tone, setTone } = useRowDraft(row);
	return (
		<Dialog isOpen={Boolean(row)} onOpenChange={onClose}>
			<DialogContent className="wg-rank" width="24rem">
				<DialogClose />
				<DialogHeader>
					<DialogTitle>Row</DialogTitle>
					<DialogDescription>{RENAME_REWRITES.replace("{count}", String(heldCards))}</DialogDescription>
				</DialogHeader>
				<div className="wr-pop">
					<Field value={label} placeholder="Name" onInput={setLabel} />
					<p className="wr-pop-hint">{EIGHT_COLOURS}</p>
					<div className="wr-swatches">
						{TONE_NAMES.map((name: string) => (
							<button
								type="button"
								key={name}
								aria-label={name}
								className={`wr-swatch ${toneClass(name)}${name === tone ? " is-on" : ""}`}
								onClick={() => setTone(name)}
							/>
						))}
					</div>
				</div>
				<DialogFooter>
					<Button size="s" onClick={onClose}>
						<ButtonLabel>Cancel</ButtonLabel>
					</Button>
					<Button size="s" variant="accent" onClick={() => onSave(label, tone)}>
						<ButtonLabel>Save</ButtonLabel>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
