import { Pill, Popover, PopoverItem, PopoverSeparator, toneOf } from "widgetarium/kit";
import { useState } from "react";
import { Glyph } from "./glyph";
import { RowFrame } from "./row-frame";
import { isUnset } from "./task-fields";
import type { Anchor, Choice } from "./types";

type ChoiceRowProps = {
	anchor: Anchor;
	name: string;
	value: unknown;
	choices: Choice[];
	onPick: (next: string) => void;
};

export function ChoiceRow({ anchor, name, value, choices, onPick }: ChoiceRowProps) {
	const [isOpen, setOpen] = useState(false);
	const unset = isUnset(value);

	const shown = unset ? (
		<span className="otd-value is-empty">Empty</span>
	) : (
		<span className="otd-value">
			<Pill tone={anchor.tones ? toneOf(anchor.tones, value) : "neutral"}>{String(value)}</Pill>
			<Glyph name="caret" className="otd-caret" />
		</span>
	);

	const pick = (next: string) => {
		setOpen(false);
		onPick(next);
	};

	return (
		<Popover
			isOpen={isOpen}
			onOpenChange={setOpen}
			trigger={
				<RowFrame anchor={anchor} name={name} unset={unset} isOpen={isOpen} asButton>
					{shown}
				</RowFrame>
			}
		>
			{choices.map((choice) => (
				<PopoverItem key={choice.value} checked={choice.value === value} onClick={() => pick(choice.value)}>
					{anchor.tones ? (
						<Pill tone={toneOf(anchor.tones, choice.value)}>{choice.value}</Pill>
					) : (
						<span>{choice.value}</span>
					)}
					{choice.note ? <span className="otd-item-note">{choice.note}</span> : null}
				</PopoverItem>
			))}
			{anchor.required ? null : (
				<>
					<PopoverSeparator />
					<PopoverItem onClick={() => pick("")}>
						<Glyph name="close" />
						Clear
					</PopoverItem>
				</>
			)}
		</Popover>
	);
}
