export interface ProjectEntry {
	readonly name: string;
	readonly path: string;
}

export interface ProjectRoute {
	readonly path: string;
	readonly file: string;
	readonly params: readonly string[];
	readonly layout: string | null;
}
