import { textOf } from "widgetarium";

export type RankTier = { label: string; tone?: string; order?: number };

export const DEFAULT_TIERS: RankTier[] = [
	{ label: "S", tone: "error", order: 1 },
	{ label: "A", tone: "warning", order: 2 },
	{ label: "B", tone: "standout", order: 3 },
	{ label: "C", tone: "success", order: 4 },
	{ label: "D", tone: "info", order: 5 },
];

const A_NEW_ROW = "New row";
const A_NEW_ROW_NTH = "New row {nth}";

export function labelOf(tier: unknown): string {
	return (textOf(tier, "label") || textOf(tier, "name")).trim();
}

export function isLabelTaken(taken: readonly string[] | null | undefined, label: string): boolean {
	return (taken ?? []).includes(label);
}

// TODO: put freeUntitled on the widget-facing surface — src/editable-tabs.js and the kanban already carry a copy each
export function freeLabel(taken: readonly string[] | null | undefined): string {
	if (!isLabelTaken(taken, A_NEW_ROW)) return A_NEW_ROW;
	for (let nth = 2; nth < (taken?.length ?? 0) + 3; nth += 1) {
		const wanted = A_NEW_ROW_NTH.replace("{nth}", String(nth));
		if (!isLabelTaken(taken, wanted)) return wanted;
	}
	return A_NEW_ROW;
}
