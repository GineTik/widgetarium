import type { FilterRow, SortRow, Unsubscribe } from "./contract";

export const NOTE_CONTENT = "content";

export const NOTE_NAME = "name";

export interface NoteRecord {
	readonly path: string;
	readonly name?: unknown;
	readonly content?: unknown;
	readonly props?: Readonly<Record<string, unknown>> | null;
}

export interface NoteAddress {
	readonly path: string;
}

export interface SlotQuery {
	readonly where: readonly FilterRow[];
	readonly sort: readonly SortRow[];
	readonly offset?: number | undefined;
	readonly limit?: number | undefined;
}

export interface SlotRows {
	readonly rows: readonly NoteRecord[];
	readonly total: number;
	readonly duplicates?: readonly unknown[] | null;
}

export interface SlotWrite {
	readonly name?: unknown;
	readonly props?: unknown;
	readonly body?: unknown;
}

export interface SlotEvent {
	readonly path?: string;
}

export interface VaultSlot {
	readonly canSubscribe?: boolean;
	readonly canCreate?: boolean;
	readonly canUpdate?: boolean;
	readonly canRemove?: boolean;
	readonly canRepairIds?: boolean;
	list(query: SlotQuery): Promise<SlotRows>;
	get(address: NoteAddress): Promise<NoteRecord | null>;
	describe?(): unknown;
	subscribe?(callback: (event: SlotEvent | null | undefined) => void): Unsubscribe;
	create?(draft: SlotWrite): Promise<NoteRecord | null>;
	update?(address: NoteAddress, patch: SlotWrite): Promise<NoteRecord | null>;
	remove?(address: NoteAddress): unknown;
	repairIds?(): unknown;
}

export interface NoteHere {
	readonly canUpdate?: boolean;
	get(): Promise<NoteRecord | null | undefined>;
	update(content: unknown): unknown;
}

export interface FolderHost {
	slot(binding: { readonly kind: "folder"; readonly path: string }): VaultSlot;
}

export interface FileHost {
	file?(path: string): NoteHere | null | undefined;
	watchFile?(path: string, callback: () => void): Unsubscribe;
}

export interface NoteFieldSpec {
	readonly kind?: unknown;
	readonly type?: string | undefined;
}

export interface NoteFieldConfig {
	readonly field?: unknown;
}

type Held<T> = T | null | undefined;

export function noteFieldOf(spec: Held<NoteFieldSpec>, config: Held<NoteFieldConfig>): string | undefined {
	const field = typeof config?.field === "string" ? config.field : undefined;
	if (spec?.kind !== "value" || !spec.type) return field;
	return field ?? NOTE_CONTENT;
}
