import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "widgetarium";
import { Button, ButtonLabel, Field } from "widgetarium/kit";
import type { CardRow, Draft } from "./types";
import { useCardDraft } from "./use-card-draft";

const CARD_PICTURE_SAID =
	"A web address, an attachment in this vault, or emoji: followed by a face name. Left empty, the card draws its letters.";

export function CardDialog({
	isOpen,
	row,
	onClose,
	onSave,
	onRemove,
}: {
	isOpen: boolean;
	row: CardRow | null;
	onClose: () => void;
	onSave: (draft: Draft) => void;
	onRemove: (() => void) | null;
}) {
	const [draft, setDraft] = useCardDraft(isOpen, row);
	return (
		<Dialog isOpen={isOpen} onOpenChange={onClose}>
			<DialogContent className="wg-rank" width="26rem">
				<DialogClose />
				<DialogHeader>
					<DialogTitle>{row ? "Edit this card" : "Add a card"}</DialogTitle>
					<DialogDescription>{CARD_PICTURE_SAID}</DialogDescription>
				</DialogHeader>
				<div className="wr-pop">
					<Field value={draft.name} placeholder="Name" onInput={(next: string) => setDraft({ ...draft, name: next })} />
					<Field
						value={draft.picture}
						placeholder="Picture"
						onInput={(next: string) => setDraft({ ...draft, picture: next })}
					/>
				</div>
				<DialogFooter>
					{onRemove ? (
						<Button size="s" variant="danger" onClick={onRemove}>
							<ButtonLabel>Remove</ButtonLabel>
						</Button>
					) : null}
					<Button size="s" onClick={onClose}>
						<ButtonLabel>Cancel</ButtonLabel>
					</Button>
					<Button size="s" variant="accent" onClick={() => onSave(draft)}>
						<ButtonLabel>{row ? "Save" : "Add card"}</ButtonLabel>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
