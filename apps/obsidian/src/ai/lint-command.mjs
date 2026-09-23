import { lintBoard } from "@widgetarium/core/board-lint.js";
import { rawBoardOfNote } from "./board-note.mjs";

export async function lintOfNote(vault, at, cards) {
	const raw = await rawBoardOfNote(vault, at);
	if (raw === null) return null;
	const errors = lintBoard(raw, (widget) => cards.find((card) => card.id === widget)?.role ?? null);
	const said = errors.map((one) => `layout ${one.path.join("/") || "root"}: ${one.message}`).join("\n");
	return { value: { note: at, valid: errors.length === 0, errors }, text: said || `${at}: the layout is valid.` };
}
