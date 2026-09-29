import { RowFrame } from "./row-frame";
import { isUnset } from "./task-fields";
import type { Anchor } from "./types";
import { useDraftFollowing } from "./use-draft-following";

// TRADE-OFF: the row IS the field — no mode to enter, and nothing to save
export function TextRow({
	anchor,
	name,
	value,
	onPick,
}: {
	anchor: Anchor;
	name: string;
	value: unknown;
	onPick: (next: string) => void;
}) {
	const [draft, setDraft] = useDraftFollowing(value);
	return (
		<RowFrame anchor={anchor} name={name} unset={isUnset(value)}>
			<span className="otd-value">
				<input
					className="otd-text"
					placeholder="Empty"
					value={draft}
					onInput={(event) => setDraft(event.currentTarget.value)}
					onBlur={() => draft !== String(value ?? "") && onPick(draft)}
					onKeyDown={(event) => {
						if (event.key === "Enter") event.currentTarget.blur();
						if (event.key === "Escape") {
							setDraft(String(value ?? ""));
							event.currentTarget.blur();
						}
					}}
				/>
			</span>
		</RowFrame>
	);
}
