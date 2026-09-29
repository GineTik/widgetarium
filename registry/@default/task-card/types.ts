export type Task = {
	title?: string;
	tags?: string[] | string;
	tagTones?: Record<string, string> | string;
	priority?: string;
	status?: string;
	progress?: number | string;
	initials?: string[] | string;
	due?: string;
	files?: number | string;
};
