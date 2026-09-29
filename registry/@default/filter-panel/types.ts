export type Group = { prop: string; control: string; label: string };
export type TaskRow = { ref: string; props?: Record<string, unknown> };
export type Chosen = Record<string, string | string[]>;

export type GroupValuesProps = {
	group: Group;
	values: string[];
	isChosen: (group: Group, value: string) => boolean;
	onToggle: (group: Group, value: string) => void;
};
