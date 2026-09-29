import { canDo } from "widgetarium";
import {
	freeLabel,
	isLabelTaken,
	labelOf,
	nextToneAfter,
	orderBetween,
	placedAt,
	renumbered,
	toneOf,
} from "@default/lib";
import type { CardRow, Gates, RackView, TierRow } from "./types";

type Rename = { standing: string[]; isRenamed: boolean; wanted: string; heldCards: number; canWriteCards: boolean };

const CANNOT_ADD_ROW = "This list does not take new rows, so nothing was added.";
const CANNOT_WRITE_ROW = "This list cannot be written here, so the row stayed as it was.";
const CANNOT_REMOVE_ROW = "This list does not drop rows, so the row is still here.";
const CARDS_ARE_READ_ONLY = "The cards under this row cannot be rewritten, so renaming it would lose them.";
const ALREADY_A_ROW = "A row is already called that, so the name stayed as it was.";

export function useRowWriting(
	held: RackView,
	{ cards, tiers, say }: Gates,
	listOf: (tier: string | null) => CardRow[],
) {
	const standing = held.rack.map((line) => line.label);

	const refileUnder = async (was: string, label: string) => {
		for (const row of listOf(was)) await cards.update({ ref: row.ref, data: { tier: label } });
	};

	return {
		addRow: async () => {
			if (!canDo(tiers.create)) return say(CANNOT_ADD_ROW);
			const last = held.tiers[held.tiers.length - 1];
			await tiers.create({
				label: freeLabel(standing),
				tone: nextToneAfter(toneOf(last)),
				order: held.tiers.length + 1,
			});
		},

		row: async (row: TierRow, label: string, tone: string) => {
			const was = labelOf(row);
			const wanted = label.trim();
			if (!wanted) return;
			if (!canDo(tiers.update)) return say(CANNOT_WRITE_ROW);
			const isRenamed = wanted !== was;
			const refusal = refusalForRename({
				standing,
				isRenamed,
				wanted,
				heldCards: listOf(was).length,
				canWriteCards: canDo(cards.update),
			});
			if (refusal) return say(refusal);
			await tiers.update({ ref: row.ref, data: { label: wanted, tone } });
			if (isRenamed) await refileUnder(was, wanted);
		},

		moveRow: async (row: TierRow, step: number) => {
			if (!canDo(tiers.update)) return say(CANNOT_WRITE_ROW);
			const at = held.tiers.findIndex((standingRow) => standingRow.ref === row.ref);
			const line = placedAt(held.tiers, row, at + step);
			const landing = line.findIndex((standingRow) => standingRow.ref === row.ref);
			const order = orderBetween(line[landing - 1] ?? null, line[landing + 1] ?? null);
			if (order !== null) {
				await tiers.update({ ref: row.ref, data: { order } });
				return;
			}
			for (const renumberedRow of renumbered(line))
				await tiers.update({ ref: renumberedRow.ref, data: { order: renumberedRow.order } });
		},

		removeRow: async (row: TierRow) => {
			if (!canDo(tiers.remove)) return say(CANNOT_REMOVE_ROW);
			await tiers.remove(row.ref);
		},
	};
}

function refusalForRename({ standing, isRenamed, wanted, heldCards, canWriteCards }: Rename) {
	if (!isRenamed) return "";
	if (isLabelTaken(standing, wanted)) return ALREADY_A_ROW;
	return heldCards > 0 && !canWriteCards ? CARDS_ARE_READ_ONLY : "";
}
