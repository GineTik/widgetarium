export interface FakeListing {
	readonly files: string[];
	readonly folders: string[];
}

export interface FakeVault {
	readonly files: Map<string, string>;
	readonly made: Set<string>;
	exists(path: string): Promise<boolean>;
	read(path: string): Promise<string>;
	write(path: string, text: string): Promise<void>;
	mkdir(path: string): Promise<void>;
	list(path: string): Promise<FakeListing>;
	remove(path: string): Promise<void>;
	rmdir(path: string): Promise<void>;
}

export function fakeVault(): FakeVault {
	const files = new Map<string, string>();
	const made = new Set<string>();
	return {
		files,
		exists: async (path) => files.has(path) || [...files.keys()].some((held) => held.startsWith(`${path}/`)),
		read: async (path) => {
			const text = files.get(path);
			if (text === undefined) throw new Error(`no such file: ${path}`);
			return text;
		},
		write: async (path, text) => {
			const parent = path.slice(0, path.lastIndexOf("/"));
			if (parent.includes("/") && !made.has(parent)) throw new Error(`no such folder: ${parent}`);
			files.set(path, text);
		},
		made,
		mkdir: async (path) => {
			made.add(path);
		},
		list: async (path) => {
			const under = `${path}/`;
			const folders = new Set<string>();
			const found: string[] = [];
			for (const held of files.keys()) {
				if (!held.startsWith(under)) continue;
				const rest = held.slice(under.length);
				const cut = rest.indexOf("/");
				if (cut === -1) found.push(held);
				else folders.add(under + rest.slice(0, cut));
			}
			return { files: found, folders: [...folders] };
		},
		remove: async (path) => {
			files.delete(path);
		},
		rmdir: async (path) => {
			for (const held of [...files.keys()]) if (held.startsWith(`${path}/`)) files.delete(held);
		},
	};
}
