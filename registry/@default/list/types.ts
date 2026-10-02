import type { PropsOf, Row, Slot, VaultRecord } from "widgetarium";
import type ListWidget from "./widget";

export type Entry = Row<VaultRecord>;
export type Handed = Record<string, unknown>;
export type RowSlot = Slot<Handed>;
export type Drawn = NonNullable<RowSlot>;
export type Reading = { failure: string | null; isLoading: boolean; total: number | null; data: readonly unknown[] };
export type Said = { text: string; tone: "muted" | "failed" | "reading"; count: string | null; canClear: boolean };

export type UpdateRow = PropsOf<typeof ListWidget>["updateRow"];
