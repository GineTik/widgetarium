import { Carried } from "./carried";
import { Head } from "./head";
import { Rack } from "./rack";
import { Tray } from "./tray";
import type { CardRow, May, Opened, RackView, Writing } from "./types";
import { useDragging } from "./use-dragging";

type BoardProps = {
	heading: string;
	held: RackView;
	opened: Opened;
	write: Writing;
	may: May;
	rootRef: { current: HTMLDivElement | null };
	size: number;
	cards: CardRow[];
};

export function Board({ heading, held, opened, write, may, rootRef, size, cards }: BoardProps) {
	const drag = useDragging(rootRef, write.into);

	const place = (tier: string | null) => {
		const row = cards.find((card) => card.ref === opened.picked);
		opened.pick("");
		if (row) void write.into(row, { tier, at: Number.MAX_SAFE_INTEGER });
	};

	const picking = {
		drag,
		picked: opened.picked,
		onPressCard: opened.pick,
		onEditCard: may.edit ? opened.editCard : null,
		onPlace: place,
	};

	return (
		<>
			<Head heading={heading} cards={cards.length} ranked={held.ranked} may={may} opened={opened} />
			<Rack
				held={held}
				{...picking}
				onNameRow={opened.nameRow}
				onMoveRow={write.moveRow}
				onRemoveRow={write.removeRow}
				onAddRow={may.addRow ? write.addRow : null}
			/>
			<Tray
				held={held}
				{...picking}
				onAddCard={may.add ? opened.addCard : null}
				onPresets={may.preset ? opened.pickPreset : null}
				onUnorphan={may.edit ? write.unorphan : null}
			/>
			{drag.carry?.isDragging ? <Carried carry={drag.carry} size={size} /> : null}
		</>
	);
}
