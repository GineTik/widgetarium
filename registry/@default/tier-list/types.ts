import { z, type PropsOf, type Row, type ViewHost } from "widgetarium";
import type { useDragging } from "./use-dragging";
import type { useOpened } from "./use-opened";
import type { useWriting } from "./use-writing";
import type TierList from "./widget";
import type { CardSchema, TierSchema } from "./widget";

type TierRecord = z.infer<typeof TierSchema>;

export type CardRecord = z.infer<typeof CardSchema>;

export type TierListProps = PropsOf<typeof TierList>;

export type CardRow = Row<CardRecord>;
export type TierRow = Row<TierRecord>;
type RackLine = { row: TierRow; label: string; tone: string; cards: CardRow[] };
export type RackView = { tiers: TierRow[]; rack: RackLine[]; tray: CardRow[]; orphans: CardRow[]; ranked: number };
export type Target = { tier: string | null; at: number };
export type Carry = { row: CardRow; x: number; y: number; offX: number; offY: number; isDragging: boolean };
export type Draft = { name: string; picture: string };
export type RenderMarkdown = ViewHost["ui"]["renderMarkdown"];
export type Commands = Pick<
	TierListProps,
	| "createCard"
	| "updateCard"
	| "removeCard"
	| "replaceCards"
	| "createTier"
	| "updateTier"
	| "removeTier"
	| "replaceTiers"
>;
export type Gates = Commands & { say: (said: string) => void };
export type Writing = ReturnType<typeof useWriting>;
export type Opened = ReturnType<typeof useOpened>;

export type Dragging = ReturnType<typeof useDragging>;
export type May = { preset: boolean; edit: boolean; add: boolean; addRow: boolean };

export type Picking = {
	drag: Dragging;
	picked: string;
	onPressCard: (ref: string) => void;
	onEditCard: ((row: CardRow) => void) | null;
	onPlace: (tier: string | null) => void;
};
