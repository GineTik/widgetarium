import { Asks } from "./asks";
import { CardDialog } from "./card-dialog";
import { PresetDialog } from "./preset-dialog";
import { RowDialog } from "./row-dialog";
import type { CardRow, Draft, May, Opened, RackView, Writing } from "./types";

export function Windows({
	held,
	opened,
	write,
	may,
	cards,
	rows,
}: {
	held: RackView;
	opened: Opened;
	write: Writing;
	may: May;
	cards: number;
	rows: number;
}) {
	const namedCards = opened.naming
		? (held.rack.find((line) => line.row.ref === opened.naming?.ref)?.cards.length ?? 0)
		: 0;

	return (
		<>
			<CardDialog
				isOpen={opened.isAdding || Boolean(opened.editing)}
				row={opened.editing}
				onClose={opened.closeCard}
				onSave={(draft: Draft) => {
					const kept = opened.editing;
					opened.closeCard();
					void write.card(kept, draft);
				}}
				onRemove={
					opened.editing && may.edit
						? () => {
								const kept = opened.editing as CardRow;
								opened.closeCard();
								void write.removeCard(kept);
							}
						: null
				}
			/>

			<RowDialog
				row={opened.naming}
				heldCards={namedCards}
				onClose={opened.closeRow}
				onSave={(label: string, tone: string) => {
					const kept = opened.naming;
					opened.closeRow();
					if (kept) void write.row(kept, label, tone);
				}}
			/>

			<PresetDialog isOpen={opened.isPicking} onClose={opened.closePresets} onPick={opened.wantPreset} />
			<Asks opened={opened} write={write} ranked={held.ranked} cards={cards} rows={rows} />
		</>
	);
}
