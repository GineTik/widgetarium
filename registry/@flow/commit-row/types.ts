export type Commit = {
	sha?: string | null;
	subject?: string | null;
	at?: string | null;
	files?: number | string | null;
	added?: number | string | null;
	removed?: number | string | null;
	parents?: readonly string[] | string | null;
};
