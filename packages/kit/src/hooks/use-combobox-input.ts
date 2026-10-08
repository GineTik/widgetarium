import type { ChangeEvent, KeyboardEvent } from "react";
import { useCombobox } from "../components/combobox-context";
import type { ComboboxState } from "../components/combobox-context";
import { usePopover } from "../components/popover-context";
import { COMBOBOX_ITEM, optionIdOf } from "../utils/combobox";
import { UP_DOWN_STEP_OF_KEY, stepIndex } from "../utils/roving";

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

export function useComboboxInput(): ComboboxInputBinding {
	const combobox = useCombobox();
	const { panelRef } = usePopover();
	return {
		role: "combobox",
		value: combobox.inputText,
		disabled: combobox.disabled,
		autoComplete: "off",
		"aria-expanded": combobox.isOpen,
		"aria-controls": combobox.listId,
		"aria-autocomplete": "list",
		"aria-activedescendant":
			combobox.isOpen && combobox.highlighted !== null ? optionIdOf(combobox.listId, combobox.highlighted) : undefined,
		onChange: (event) => combobox.type(event.currentTarget.value),
		onKeyDown: (event) => answerKey(event, combobox, panelRef.current),
		onClick: () => combobox.setOpen(true),
	};
}

function answerKey(event: KeyboardEvent<HTMLInputElement>, combobox: ComboboxState, panel: HTMLElement | null): void {
	const items = [...(panel?.querySelectorAll<HTMLElement>(COMBOBOX_ITEM) ?? [])];
	const step = UP_DOWN_STEP_OF_KEY.get(event.key);
	if (step !== undefined) {
		event.preventDefault();
		if (!combobox.isOpen) return combobox.setOpen(true);
		const at = items.findIndex((item) => item.dataset["key"] === combobox.highlighted);
		return combobox.highlight(items[stepIndex(at, step, items.length)]?.dataset["key"] ?? null);
	}
	if (event.key === "Enter" && combobox.isOpen) {
		event.preventDefault();
		return items.find((item) => item.dataset["key"] === combobox.highlighted)?.click();
	}
	if (event.key === "Backspace" && combobox.isMultiple && event.currentTarget.value === "") {
		const last = combobox.selectedKeys.at(-1);
		if (last !== undefined) combobox.remove(last);
	}
}
