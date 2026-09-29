export type FileChange = {
	filePath?: string | null;
	added?: number | string | null;
	removed?: number | string | null;
	change?: string | null;
	from?: string | null;
};

export type Kind = { icon: string; word: string; mark: string };
