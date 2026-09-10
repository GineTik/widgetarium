import { collectionGateway, valueGateway } from "./create";
import { stableKey } from "./cache";

const toRow = (record) => ({ ref: record.path, value: record });

function bakedQuery(baked, query) {
	const asked = query ?? {};
	const where = [...(baked.where ?? []), ...(asked.where ?? [])];
	const sort = asked.sort?.length ? asked.sort : baked.sort ?? [];
	return { where, sort, limit: asked.limit };
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
	const record = await slot.update({ path: ref }, { name, props: props ?? (Object.keys(loose).length > 0 ? loose : undefined), body });
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

export function fileGateway({ host, path, requested = [] }) {
	const solo = host.file?.(path);
	const handlers = {};
	if (solo) handlers.get = () => solo.get();
	if (solo?.canUpdate) handlers.update = (content) => solo.update(content);

	return valueGateway({
		id: `file:${path}`,
		handlers,
		requested,
		subscribe: host.watchFile ? (listener) => host.watchFile(path, () => listener({ refs: [path] })) : undefined,
	});
}
