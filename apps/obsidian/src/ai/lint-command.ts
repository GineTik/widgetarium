import { lintBoard } from "@widgetarium/core/board-lint.js";
import { rawBoardOfNote } from "./board-note.js";
import type { RoledCard } from "./widget-entry.js";

type LintFinding = ReturnType<typeof lintBoard>[number];

export interface LintAnswer {
	readonly value: { readonly note: string; readonly valid: boolean; readonly errors: LintFinding[] };
	readonly text: string;
}

export async function lintOfNote(vault: string, at: string, cards: readonly RoledCard[]): Promise<LintAnswer | null> {
	const raw = await rawBoardOfNote(vault, at);
	if (raw === null) return null;
	const errors = lintBoard(raw, (widget) => cards.find((card) => card.id === widget)?.role ?? null);
	const said = errors.map((one) => `layout ${one.path.join("/") || "root"}: ${one.message}`).join("\n");
	return { value: { note: at, valid: errors.length === 0, errors }, text: said || `${at}: the layout is valid.` };
}
