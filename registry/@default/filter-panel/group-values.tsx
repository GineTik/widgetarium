import { PopoverItem } from "widgetarium/kit";
import { PEOPLE } from "./control-kinds";
import type { GroupValuesProps } from "./types";

const FIRST_TONE = "is-accent";

const TONES = [FIRST_TONE, "is-ok", "is-warn", "is-err"];

export function GroupValues({ group, values, isChosen, onToggle }: GroupValuesProps) {
	return values.length === 0 ? (
		<p className="ofp-empty">Nothing to choose from yet.</p>
	) : (
		values.map((value) => (
			<PopoverItem
				key={value}
				className="ofp-option"
				checked={isChosen(group, value)}
				onClick={() => onToggle(group, value)}
			>
				{group.control === PEOPLE ? <span className={`ofp-av ${toneOf(value)}`}>{initialOf(value)}</span> : null}
				<span className="ofp-name">{value}</span>
			</PopoverItem>
		))
	);
}

function initialOf(value: string): string {
	return (
		String(value ?? "?")
			.trim()
			.charAt(0)
			.toUpperCase() || "?"
	);
}

// TRADE-OFF: hashed, so there is no palette to maintain
function toneOf(value: string): string {
	let sum = 0;
	for (const letter of String(value)) sum += letter.charCodeAt(0);
	return TONES[sum % TONES.length] ?? FIRST_TONE;
}
