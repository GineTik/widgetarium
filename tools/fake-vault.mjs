export function fakeVault() {
	const files = new Map();
	return {
		files,
		exists: async (path) => files.has(path) || [...files.keys()].some((held) => held.startsWith(`${path}/`)),
		read: async (path) => files.get(path),
		write: async function (path, text) {
			const parent = path.slice(0, path.lastIndexOf("/"));
			if (parent.includes("/") && !this.made.has(parent)) throw new Error(`no such folder: ${parent}`);
			files.set(path, text);
		},
		made: new Set(),
		mkdir: async function (path) { this.made.add(path); },
		list: async (path) => {
			const under = `${path}/`;
			const folders = new Set();
			const found = [];
			for (const held of files.keys()) {
				if (!held.startsWith(under)) continue;
				const rest = held.slice(under.length);
				const cut = rest.indexOf("/");
				if (cut === -1) found.push(held);
				else folders.add(under + rest.slice(0, cut));
			}
			return { files: found, folders: [...folders] };
		},
		remove: async (path) => { files.delete(path); },
		rmdir: async (path) => { for (const held of [...files.keys()]) if (held.startsWith(`${path}/`)) files.delete(held); },
	};
}
