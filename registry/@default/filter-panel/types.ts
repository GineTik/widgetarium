import type { Row, VaultRecord } from "widgetarium";
import type { z } from "zod";
import type { ChosenSchema } from "./widget";

export type Group = { prop: string; control: string; label: string };
export type TaskRow = Row<VaultRecord>;
export type Chosen = z.infer<typeof ChosenSchema>;

export type GroupValuesProps = {
	group: Group;
	values: string[];
	isChosen: (group: Group, value: string) => boolean;
	onToggle: (group: Group, value: string) => void;
};
