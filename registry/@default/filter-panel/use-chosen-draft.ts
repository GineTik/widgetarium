import type { DrawnProps } from "widgetarium";
import { useState } from "react";
import { RADIO } from "./control-kinds";
import type { Chosen, Group } from "./types";
import type { props } from "./widget";

type FilterProps = DrawnProps<typeof props>;

// TRADE-OFF: a draft until Apply, so ticking four boxes queries the vault once
export function useChosenDraft(applied: Chosen, chosen: FilterProps["chosen"]) {
	const [isOpen, setOpen] = useState(false);
	const [draft, setDraft] = useState<Chosen>(applied);

	const draftAfterRadio = (group: Group, value: string) => {
		if (draft[group.prop] === value) return dropProp(draft, group.prop);
		return { ...draft, [group.prop]: value };
	};

	const draftAfterCheck = (group: Group, value: string) => {
		const held = (draft[group.prop] as string[]) ?? [];
		const next = held.includes(value) ? held.filter((item) => item !== value) : [...held, value];
		if (next.length === 0) return dropProp(draft, group.prop);
		return { ...draft, [group.prop]: next };
	};

	return {
		isOpen,
		change: (next: boolean) => {
			if (next) setDraft(applied);
			setOpen(next);
		},
		isChosen: (group: Group, value: string) => {
			if (group.control === RADIO) return draft[group.prop] === value;
			return ((draft[group.prop] as string[]) ?? []).includes(value);
		},
		toggle: (group: Group, value: string) => {
			if (group.control === RADIO) return setDraft(draftAfterRadio(group, value));
			setDraft(draftAfterCheck(group, value));
		},
		apply: () => {
			chosen.update(draft);
			setOpen(false);
		},
		reset: () => {
			setDraft({});
			chosen.update({});
		},
	};
}

function dropProp(chosen: Chosen, prop: string): Chosen {
	const { [prop]: gone, ...rest } = chosen;
	return rest;
}
