import { collectionGateway, rowOf } from "@widgetarium/core/gateway/create.js";
import { stableKey } from "@widgetarium/core/gateway/cache.js";
import type {
	CollectionGateway,
	FilterRow,
	GatewayEvent,
	Row,
	SortRow,
	Unsubscribe,
} from "@widgetarium/core/gateway/contract.js";
import type { FolderHost, NoteRecord, SlotQuery, SlotWrite, VaultSlot } from "@widgetarium/core/gateway/obsidian.js";
import { recordRefOf } from "./note-ref.js";

interface BakedReading {
	readonly where?: readonly FilterRow[];
	readonly sort?: readonly SortRow[];
}

interface FolderGatewayOptions {
	readonly host: FolderHost;
	readonly path: string;
	readonly baked?: BakedReading;
	readonly requested?: readonly string[];
}

interface AskedQuery {
	readonly where?: readonly FilterRow[];
	readonly sort?: readonly SortRow[];
	readonly offset?: number;
	readonly limit?: number;
}

interface DraftWithProps extends SlotWrite {
	readonly [field: string]: unknown;
}

interface NotePatch {
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

const toRow = (record: NoteRecord): NoteRow => rowOf<NoteRecord>(record, record.path);

function folderSubscription(slot: VaultSlot): { subscribe?: Subscribe } {
	if (!slot.canSubscribe || !slot.subscribe) return {};
	const subscribe = slot.subscribe.bind(slot);
	return {
		subscribe: (listener) => subscribe((event) => listener(event?.path ? { refs: [recordRefOf(event.path)] } : {})),
	};
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

function folderIdPerReading(path: string, baked: BakedReading): string {
	return `folder:${path}?${stableKey(baked)}`;
}
