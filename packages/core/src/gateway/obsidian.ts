import { collectionGateway, rowOf, valueGateway } from "./create";
import type {
	CollectionGateway,
	FilterRow,
	GatewayEvent,
	RecordRef,
	Row,
	SortRow,
	Unsubscribe,
	ValueGateway,
} from "./contract";
import type { EveryValueVerb } from "./needs";
import { stableKey } from "./cache";
import { coerceOne } from "./mapped";

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

export interface BakedReading {
	readonly where?: readonly FilterRow[];
	readonly sort?: readonly SortRow[];
}

export interface AskedQuery {
	readonly where?: readonly FilterRow[];
	readonly sort?: readonly SortRow[];
	readonly offset?: number;
	readonly limit?: number;
}

export interface NotePart {
	readonly field?: string | undefined;
	readonly type?: string | undefined;
}

export interface NoteFieldSpec {
	readonly kind?: unknown;
	readonly type?: string | undefined;
}

export interface NoteFieldConfig {
	readonly field?: string | undefined;
}

export interface FolderGatewayOptions {
	readonly host: FolderHost;
	readonly path: string;
	readonly baked?: BakedReading;
	readonly requested?: readonly string[];
}

export interface FileGatewayOptions {
	readonly host: FileHost;
	readonly path: string;
	readonly part?: NotePart;
	readonly requested?: readonly string[];
}

export interface DraftWithProps extends SlotWrite {
	readonly [field: string]: unknown;
}

export interface NotePatch {
	readonly ref: string;
	readonly data?: DraftWithProps | null;
}

type Held<T> = T | null | undefined;

type Subscribe = (listener: (event: GatewayEvent) => void) => Unsubscribe;

type NoteRow = Row<NoteRecord>;

type FolderReads = {
	list: (query: Held<AskedQuery>) => Promise<{ rows: NoteRow[]; total: number; duplicates: readonly unknown[] }>;
	get: (ref: Held<string>) => Promise<NoteRow | null>;
	describe?: () => unknown;
};

type FolderWrites = {
	create?: (draft: Held<DraftWithProps>) => Promise<NoteRow | null>;
	update?: (input: NotePatch) => Promise<NoteRow | null>;
	remove?: (ref: string) => unknown;
	repairIds?: () => unknown;
};

type NoteHandlers = {
	get?: () => Promise<unknown>;
	update?: (content: unknown) => unknown;
};

const NOTE_PARTS: ReadonlyMap<string, (record: NoteRecord) => unknown> = new Map([
	[NOTE_CONTENT, (record: NoteRecord) => record.content],
	[NOTE_NAME, (record: NoteRecord) => record.name],
]);

export function folderGateway({
	host,
	path,
	baked = {},
	requested = [],
}: FolderGatewayOptions): CollectionGateway<NoteRecord> {
	const slot = host.slot({ kind: "folder", path });
	return collectionGateway({
		id: folderIdPerReading(path, baked),
		handlers: { ...folderReads(slot, baked), ...folderWrites(slot) },
		requested: [...requested],
		...folderSubscription(slot),
	});
}

export function noteFieldOf(spec: Held<NoteFieldSpec>, config: Held<NoteFieldConfig>): string | undefined {
	if (spec?.kind !== "value" || !spec.type) return config?.field;
	return config?.field ?? NOTE_CONTENT;
}

export function fieldOfNote(record: Held<NoteRecord>, field: Held<string>, type: Held<string>): unknown {
	if (!record || !field) return record;
	return coerceOne(partOfNote(record, field), type ?? "");
}

export function fileGateway({
	host,
	path,
	part = {},
	requested = [],
}: FileGatewayOptions): ValueGateway<unknown, EveryValueVerb> {
	const { field, type } = part;
	return valueGateway({
		id: field ? `file:${path}#${field}` : `file:${path}`,
		handlers: noteHandlers(host.file?.(path), field, type),
		requested: [...requested],
		...fileSubscription(host, path),
	});
}

const toRow = (record: NoteRecord): NoteRow => rowOf<NoteRecord>(record, record.path);

const recordRefOf = (path: string): RecordRef => rowOf<object>({}, path).ref;

function folderSubscription(slot: VaultSlot): { subscribe?: Subscribe } {
	if (!slot.canSubscribe || !slot.subscribe) return {};
	const subscribe = slot.subscribe.bind(slot);
	return {
		subscribe: (listener) => subscribe((event) => listener(event?.path ? { refs: [recordRefOf(event.path)] } : {})),
	};
}

function fileSubscription(host: FileHost, path: string): { subscribe?: Subscribe } {
	if (!host.watchFile) return {};
	const watchFile = host.watchFile.bind(host);
	return { subscribe: (listener) => watchFile(path, () => listener({ refs: [recordRefOf(path)] })) };
}

function bakeQuery(baked: BakedReading, query: Held<AskedQuery>): SlotQuery {
	const asked = query ?? {};
	const where = [...(baked.where ?? []), ...(asked.where ?? [])];
	const sort = asked.sort?.length ? asked.sort : (baked.sort ?? []);
	return { where, sort, offset: asked.offset, limit: asked.limit };
}

function folderReads(slot: VaultSlot, baked: BakedReading): FolderReads {
	const reads: FolderReads = {
		list: async (query) => {
			const result = await slot.list(bakeQuery(baked, query));
			return { rows: result.rows.map(toRow), total: result.total, duplicates: result.duplicates ?? [] };
		},
		get: async (ref) => {
			if (!ref) return null;
			const record = await slot.get({ path: ref });
			return record ? toRow(record) : null;
		},
	};
	if (!slot.describe) return reads;
	const describe = slot.describe.bind(slot);
	return { ...reads, describe: () => describe() };
}

function folderWrites(slot: VaultSlot): FolderWrites {
	const handlers: FolderWrites = {};
	if (slot.canCreate && slot.create) handlers.create = createOnSlot(slot.create.bind(slot));
	if (slot.canUpdate && slot.update) handlers.update = updateOnSlot(slot.update.bind(slot));
	if (slot.canRemove && slot.remove) {
		const remove = slot.remove.bind(slot);
		handlers.remove = (ref) => remove({ path: ref });
	}
	if (slot.canRepairIds && slot.repairIds) {
		const repairIds = slot.repairIds.bind(slot);
		handlers.repairIds = () => repairIds();
	}
	return handlers;
}

function createOnSlot(create: NonNullable<VaultSlot["create"]>): NonNullable<FolderWrites["create"]> {
	return async (draft) => {
		const { name, props, body, ...loose } = draft ?? {};
		const record = await create({ name, props: props ?? loose, body });
		return record ? toRow(record) : null;
	};
}

function updateOnSlot(update: NonNullable<VaultSlot["update"]>): NonNullable<FolderWrites["update"]> {
	return async ({ ref, data }) => {
		const { name, props, body, ...loose } = data ?? {};
		const record = await update(
			{ path: ref },
			{ name, props: props ?? (Object.keys(loose).length > 0 ? loose : undefined), body },
		);
		return record ? toRow(record) : null;
	};
}

function partOfNote(record: NoteRecord, field: string): unknown {
	const part = NOTE_PARTS.get(field);
	return part ? part(record) : record.props?.[field];
}

function noteHandlers(solo: Held<NoteHere>, field: Held<string>, type: Held<string>): NoteHandlers {
	if (!solo) return {};
	const get = async (): Promise<unknown> => fieldOfNote(await solo.get(), field, type);
	// TODO: write a name or a property back — only the body has a writer on one note
	if (!solo.canUpdate || (field && field !== NOTE_CONTENT)) return { get };
	return { get, update: (content) => solo.update(content) };
}

function folderIdPerReading(path: string, baked: BakedReading): string {
	return `folder:${path}?${stableKey(baked)}`;
}
