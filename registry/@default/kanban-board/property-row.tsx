import { anchorOf } from "./anchors";
import { ChoiceRow } from "./choice-row";
import { DeadlineRow } from "./deadline-row";
import { MembersRow } from "./members-row";
import { ProgressRow } from "./progress-row";
import { keyFor } from "./task-fields";
import { TextRow } from "./text-row";

type PropertyRowProps = {
	name: string;
	props: Record<string, unknown>;
	columns: string[];
	roster: string[];
	today: Date;
	onWrite: (key: string, value: unknown) => void;
};

export function PropertyRow({ name, props, columns, roster, today, onWrite }: PropertyRowProps) {
	const anchor = anchorOf(name);
	const key = keyFor(props, name);
	const value = props?.[key];
	const write = (next: unknown) => onWrite(key, next);

	if (anchor.kind === "choice") {
		return (
			<ChoiceRow
				anchor={anchor}
				name={name}
				value={value}
				choices={anchor.choices ?? columns.map((column) => ({ value: column }))}
				onPick={write}
			/>
		);
	}
	if (anchor.kind === "progress") return <ProgressRow anchor={anchor} name={name} value={value} onPick={write} />;
	if (anchor.kind === "date") {
		return <DeadlineRow anchor={anchor} name={name} value={value} today={today} onPick={write} />;
	}
	if (anchor.kind === "people") {
		return <MembersRow anchor={anchor} name={name} value={value} roster={roster} onPick={write} />;
	}
	return <TextRow anchor={anchor} name={name} value={value} onPick={write} />;
}
