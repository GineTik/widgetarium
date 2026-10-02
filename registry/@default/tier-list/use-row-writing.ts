import { freeLabel, isLabelTaken, labelOf } from "./tiers";
import { nextToneAfter, toneOf } from "./tones";
import { orderBetween, placeAt, renumber } from "./ordering";
import type { CardRow, Gates, RackView, TierRow } from "./types";

type Rename = { standing: string[]; isRenamed: boolean; wanted: string; heldCards: number; canWriteCards: boolean };

const CANNOT_ADD_ROW = "This list does not take new rows, so nothing was added.";
const CANNOT_WRITE_ROW = "This list cannot be written here, so the row stayed as it was.";
const CANNOT_REMOVE_ROW = "This list does not drop rows, so the row is still here.";
const CARDS_ARE_READ_ONLY = "The cards under this row cannot be rewritten, so renaming it would lose them.";
const ALREADY_A_ROW = "A row is already called that, so the name stayed as it was.";

export function useRowWriting(
	held: RackView,
	{ updateCard, createTier, updateTier, removeTier, say }: Gates,
	listOf: (tier: string | null) => CardRow[],
) {
	const standing = held.rack.map((line) => line.label);

	const refileUnder = async (was: string, label: string) => {
		for (const row of listOf(was)) await updateCard({ ref: row.ref, tier: label });
	};

	return {
		addRow: async () => {
			if (!createTier.can().can) return say(CANNOT_ADD_ROW);
			const last = held.tiers[held.tiers.length - 1];
			await createTier({
				id: crypto.randomUUID(),
				label: freeLabel(standing),
				tone: nextToneAfter(toneOf(last)),
				order: held.tiers.length + 1,
			});
		},

		row: async (row: TierRow, label: string, tone: string) => {
			const was = labelOf(row);
			const wanted = label.trim();
			if (!wanted) return;
			if (!updateTier.can().can) return say(CANNOT_WRITE_ROW);
			const isRenamed = wanted !== was;
			const refusal = refusalForRename({
				standing,
				isRenamed,
				wanted,
				heldCards: listOf(was).length,
				canWriteCards: updateCard.can().can,
			});
			if (refusal) return say(refusal);
			await updateTier({ ref: row.ref, label: wanted, tone });
			if (isRenamed) await refileUnder(was, wanted);
		},

		moveRow: async (row: TierRow, step: number) => {
			if (!updateTier.can().can) return say(CANNOT_WRITE_ROW);
			const at = held.tiers.findIndex((standingRow) => standingRow.ref === row.ref);
			const line = placeAt(held.tiers, row, at + step);
			const landing = line.findIndex((standingRow) => standingRow.ref === row.ref);
			const order = orderBetween(line[landing - 1] ?? null, line[landing + 1] ?? null);
			if (order !== null) {
				await updateTier({ ref: row.ref, order });
				return;
			}
			for (const renumberedRow of renumber(line))
				await updateTier({ ref: renumberedRow.ref, order: renumberedRow.order });
		},

		removeRow: async (row: TierRow) => {
			if (!removeTier.can().can) return say(CANNOT_REMOVE_ROW);
			await removeTier({ ref: row.ref });
		},
	};
}

function refusalForRename({ standing, isRenamed, wanted, heldCards, canWriteCards }: Rename) {
	if (!isRenamed) return "";
	if (isLabelTaken(standing, wanted)) return ALREADY_A_ROW;
	return heldCards > 0 && !canWriteCards ? CARDS_ARE_READ_ONLY : "";
}
