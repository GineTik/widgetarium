export type Project = {
	mark?: string | null;
	name?: string | null;
	repository?: string | null;
	open?: number | string | null;
	doing?: number | string | null;
	done?: number | string | null;
	touched?: string | null;
};

export type Counted = { field: string; label: string; tone: string; count: number };

export type Head = { mark: string | null; name: string | null; repository: string | null };
