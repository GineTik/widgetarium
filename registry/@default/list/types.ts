import { IValueGateway, type DrawnProps, type Row, type Slot, type VaultRecord } from "widgetarium";
import type { props } from "./widget";

export type Entry = Row<VaultRecord>;
export type Handed = Record<string, IValueGateway>;
export type RowSlot = Slot<Handed>;
export type Drawn = NonNullable<RowSlot>;
export type Reading = { failure: string | null; isLoading: boolean; total: number | null; data: readonly unknown[] };
export type Said = { text: string; tone: "muted" | "failed" | "reading"; count: string | null; canClear: boolean };

export type Rows = DrawnProps<typeof props>["rows"];
