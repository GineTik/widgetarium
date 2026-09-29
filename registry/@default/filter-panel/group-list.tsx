import { valuesFor } from "./control-kinds";
import { FilterGroup } from "./filter-group";
import type { Group, TaskRow } from "./types";
import type { useChosenDraft } from "./use-chosen-draft";

type GroupListProps = {
	groups: Group[];
	rows: TaskRow[];
	needle: string;
	unfolded: string;
	onUnfold: (prop: string) => void;
	picking: ReturnType<typeof useChosenDraft>;
};

export function GroupList({ groups, rows, needle, unfolded, onUnfold, picking }: GroupListProps) {
	const matching = (value: string) => needle === "" || value.toLowerCase().includes(needle);
	return groups.map((group: Group) => (
		<FilterGroup
			key={group.prop}
			group={group}
			values={valuesFor(rows, group.prop).filter(matching)}
			isUnfolded={unfolded === group.prop}
			onUnfold={onUnfold}
			isChosen={picking.isChosen}
			onToggle={picking.toggle}
		/>
	));
}
