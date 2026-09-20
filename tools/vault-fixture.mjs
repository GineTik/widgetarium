import { fieldsOf } from "../src/gateway/fields.js";

const under = (files, at) => Object.keys(files).filter((key) => key.startsWith(`${at}/`));

function foldersIn(files, at) {
	const seen = new Set();
	for (const key of under(files, at)) {
		const rest = key.slice(at.length + 1);
		if (rest.includes("/")) seen.add(`${at}/${rest.split("/")[0]}`);
	}
	return [...seen];
}

const leavesIn = (files, at) => under(files, at).filter((key) => !key.slice(at.length + 1).includes("/"));

export function createFileTree(files) {
	return {
		exists: async (at) =>
			Object.prototype.hasOwnProperty.call(files, at) ||
			foldersIn(files, at).length > 0 ||
			leavesIn(files, at).length > 0,
		read: async (at) => files[at],
		list: async (at) => ({ folders: foldersIn(files, at), files: leavesIn(files, at) }),
	};
}

export function createRowSlot(rows) {
	return {
		canCreate: true,
		canUpdate: true,
		canRemove: true,
		canSubscribe: false,
		canDescribe: true,
		list: async () => ({ rows, total: rows.length }),
		get: async (ref) => rows.find((row) => row.path === ref.path) ?? null,
		describe: async () => fieldsOf(rows),
		create: async () => null,
		update: async () => null,
		remove: async () => null,
	};
}

export function createProbeHost(slot) {
	return { platform: "probe", can: {}, slot: () => slot, ui: { notify() {}, openNote() {} }, here: null };
}
