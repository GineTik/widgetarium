import type { ChangeEvent, KeyboardEvent } from "react";
import { useCombobox } from "../components/combobox-context";
import type { ComboboxState } from "../components/combobox-context";
import { usePopover } from "../components/popover-context";
import { COMBOBOX_ITEM, optionIdOf } from "../utils/combobox";
import { UP_DOWN_STEP_OF_KEY, stepIndex } from "../utils/roving";
import type { Step } from "../utils/roving";

export interface ComboboxInputBinding {
	readonly role: "combobox";
	readonly value: string;
	readonly disabled: boolean;
	readonly autoComplete: "off";
	readonly "aria-expanded": boolean;
	readonly "aria-controls": string;
	readonly "aria-autocomplete": "list";
	readonly "aria-activedescendant": string | undefined;
	readonly onChange: (event: ChangeEvent<HTMLInputElement>) => void;
	readonly onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
	readonly onClick: () => void;
}

interface KeyAsk {
	readonly event: KeyboardEvent<HTMLInputElement>;
	readonly combobox: ComboboxState;
	readonly panel: HTMLElement | null;
}

const INPUT_ROLE: Pick<ComboboxInputBinding, "role" | "autoComplete" | "aria-autocomplete"> = {
	role: "combobox",
	autoComplete: "off",
	"aria-autocomplete": "list",
};

export function useComboboxInput(): ComboboxInputBinding {
	const combobox = useCombobox();
	const { panelRef } = usePopover();
	return {
		...INPUT_ROLE,
		value: combobox.inputText,
		disabled: combobox.disabled,
		"aria-expanded": combobox.isOpen,
		"aria-controls": combobox.listId,
		"aria-activedescendant": activeDescendantOf(combobox),
		onChange: (event) => combobox.type(event.currentTarget.value),
		onKeyDown: (event) => answerKey({ event, combobox, panel: panelRef.current }),
		onClick: () => combobox.setOpen(true),
	};
}

function activeDescendantOf(combobox: ComboboxState): string | undefined {
	if (!combobox.isOpen || combobox.highlighted === null) return undefined;
	return optionIdOf(combobox.listId, combobox.highlighted);
}

function answerKey(ask: KeyAsk): void {
	const step = UP_DOWN_STEP_OF_KEY.get(ask.event.key);
	if (step !== undefined) return stepHighlight(ask, step);
	if (ask.event.key === "Enter") return chooseHighlighted(ask);
	if (ask.event.key === "Backspace") removeLastChosen(ask);
}

function stepHighlight({ event, combobox, panel }: KeyAsk, step: Step): void {
	event.preventDefault();
	if (!combobox.isOpen) return combobox.setOpen(true);
	const items = itemsIn(panel);
	const at = items.findIndex((item) => item.dataset["key"] === combobox.highlighted);
	combobox.highlight(items[stepIndex(at, step, items.length)]?.dataset["key"] ?? null);
}

function chooseHighlighted({ event, combobox, panel }: KeyAsk): void {
	if (!combobox.isOpen) return;
	event.preventDefault();
	itemsIn(panel)
		.find((item) => item.dataset["key"] === combobox.highlighted)
		?.click();
}

function removeLastChosen({ event, combobox }: KeyAsk): void {
	if (!combobox.isMultiple || event.currentTarget.value !== "") return;
	const last = combobox.selectedKeys.at(-1);
	if (last !== undefined) combobox.remove(last);
}

function itemsIn(panel: HTMLElement | null): HTMLElement[] {
	return [...(panel?.querySelectorAll<HTMLElement>(COMBOBOX_ITEM) ?? [])];
}
