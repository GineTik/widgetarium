import { Icon } from "widgetarium/kit";
import { GroupValues } from "./group-values";
import type { GroupValuesProps } from "./types";

type FilterGroupProps = GroupValuesProps & { isUnfolded: boolean; onUnfold: (prop: string) => void };

export function FilterGroup({ group, values, isUnfolded, onUnfold, isChosen, onToggle }: FilterGroupProps) {
	return (
		<div className="ofp-group">
			<button
				type="button"
				className={`ofp-group-head${isUnfolded ? " is-on" : ""}`}
				onClick={() => onUnfold(isUnfolded ? "" : group.prop)}
			>
				<span>{group.label}</span>
				<Icon name="chevron" className="ofp-chev" />
			</button>
			{isUnfolded ? <GroupValues group={group} values={values} isChosen={isChosen} onToggle={onToggle} /> : null}
		</div>
	);
}
