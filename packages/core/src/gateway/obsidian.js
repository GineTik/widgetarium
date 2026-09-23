import { collectionGateway, valueGateway } from "./create";
import { stableKey } from "./cache";
import { coercedOne } from "./mapped";

const toRow = (record) => ({ ...record, ref: record.path });

function bakedQuery(baked, query) {
	const asked = query ?? {};
	const where = [...(baked.where ?? []), ...(asked.where ?? [])];
	const sort = asked.sort?.length ? asked.sort : (baked.sort ?? []);
	return { where, sort, offset: asked.offset, limit: asked.limit };
}

function folderReads(slot, baked) {
	return {
		list: async (query) => {
			const result = await slot.list(bakedQuery(baked, query));
			return { rows: result.rows.map(toRow), total: result.total, duplicates: result.duplicates ?? [] };
		},
		get: async (ref) => {
			if (!ref) return null;
			const record = await slot.get({ path: ref });
			return record ? toRow(record) : null;
		},
		...(slot.describe ? { describe: () => slot.describe() } : {}),
	};
}

async function createOnSlot(slot, draft) {
	const { name, props, body, ...loose } = draft ?? {};
	const record = await slot.create({ name, props: props ?? loose, body });
	return record ? toRow(record) : null;
}

async function updateOnSlot(slot, { ref, data }) {
	const { name, props, body, ...loose } = data ?? {};
	const record = await slot.update(
		{ path: ref },
		{ name, props: props ?? (Object.keys(loose).length > 0 ? loose : undefined), body },
	);
	return record ? toRow(record) : null;
}

function folderWrites(slot) {
	const handlers = {};
	if (slot.canCreate) handlers.create = (draft) => createOnSlot(slot, draft);
	if (slot.canUpdate) handlers.update = (input) => updateOnSlot(slot, input);
	if (slot.canRemove) handlers.remove = (ref) => slot.remove({ path: ref });
	if (slot.canRepairIds) handlers.repairIds = () => slot.repairIds();
	return handlers;
}

export function folderGateway({ host, path, baked = {}, requested = [] }) {
	const slot = host.slot({ kind: "folder", path });
	return collectionGateway({
		// CONTEXT: the baked query is identity — two widgets over one folder share a cache only when they read it the same way
		id: `folder:${path}?${stableKey(baked)}`,
		handlers: { ...folderReads(slot, baked), ...folderWrites(slot) },
		requested,
		subscribe: slot.canSubscribe
			? (listener) => slot.subscribe((event) => listener({ refs: event?.path ? [event.path] : undefined }))
			: undefined,
	});
}

export const NOTE_CONTENT = "content";
export const NOTE_NAME = "name";

const NOTE_PARTS = {
	[NOTE_CONTENT]: (record) => record.content,
	[NOTE_NAME]: (record) => record.name,
};

export function noteFieldOf(spec, config) {
	if (spec?.kind !== "value" || !spec.type) return config?.field;
	return config?.field ?? NOTE_CONTENT;
}

function partOfNote(record, field) {
	return Object.hasOwn(NOTE_PARTS, field) ? NOTE_PARTS[field](record) : record.props?.[field];
}

export function fieldOfNote(record, field, type) {
	if (!record || !field) return record;
	return coercedOne(partOfNote(record, field), type);
}

function noteHandlers(solo, field, type) {
	if (!solo) return {};
	const get = async () => fieldOfNote(await solo.get(), field, type);
	// TODO: write a name or a property back — only the body has a writer on one note
	if (!solo.canUpdate || (field && field !== NOTE_CONTENT)) return { get };
	return { get, update: (content) => solo.update(content) };
}

export function fileGateway({ host, path, part = {}, requested = [] }) {
	const { field, type } = part;
	const handlers = noteHandlers(host.file?.(path), field, type);

	return valueGateway({
		id: field ? `file:${path}#${field}` : `file:${path}`,
		handlers,
		requested,
		subscribe: host.watchFile ? (listener) => host.watchFile(path, () => listener({ refs: [path] })) : undefined,
	});
}
