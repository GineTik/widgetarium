import { Progress } from "widgetarium/kit";
import { RowFrame } from "./row-frame";
import { isUnset } from "./task-fields";
import type { Anchor } from "./types";

export function ProgressRow({
	anchor,
	name,
	value,
	onPick,
}: {
	anchor: Anchor;
	name: string;
	value: unknown;
	onPick: (next: number) => void;
}) {
	const number = Number(value);
	return (
		<RowFrame anchor={anchor} name={name} unset={isUnset(value)}>
			<span className="otd-value">
				<Progress value={Number.isFinite(number) ? number : 0} label={name} onChange={onPick} />
			</span>
		</RowFrame>
	);
}
