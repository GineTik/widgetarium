import { createElement as h, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { SidebarGroup, SidebarRow } from "@widgetarium/kit";

export interface Choice {
	readonly id: string;
	readonly title: ReactNode;
	readonly section: string;
	readonly said?: ReactNode;
	readonly selected: boolean;
	readonly onPick: () => void;
}

export function ChoiceList({ choices }: { readonly choices: readonly Choice[] }): ReactElement {
	const [aimedId, setAimedId] = useState<string | null>(null);
	const said = (choices.find((choice) => choice.id === aimedId) ?? choices.find((choice) => choice.selected))?.said;
	const sections = sectionsOf(choices).map(([section, held]) => sectionGroup(section, held, setAimedId));
	return h("div", { className: "wg-set-choices", onPointerLeave: () => setAimedId(null) }, [
		h("div", { className: "wg-set-choice-sections", key: "sections" }, sections),
		said ? h("p", { className: "wg-set-choice-said", key: "said", "aria-live": "polite" }, said) : null,
	]);
}

function sectionsOf(choices: readonly Choice[]): (readonly [string, readonly Choice[]])[] {
	const sections = new Map<string, Choice[]>();
	for (const choice of choices) sections.set(choice.section, [...(sections.get(choice.section) ?? []), choice]);
	return [...sections.entries()];
}

function sectionGroup(section: string, held: readonly Choice[], aimAt: (id: string) => void): ReactElement {
	const rows = held.map((choice) => choiceRow(choice, () => aimAt(choice.id)));
	return h(SidebarGroup, { className: "wg-set-sources", key: `section:${section}`, label: section }, rows);
}

function choiceRow(choice: Choice, aim: () => void): ReactElement {
	return h(SidebarRow, {
		key: choice.id,
		as: "button",
		label: choice.title,
		selected: choice.selected,
		onClick: choice.onPick,
		onPointerEnter: aim,
		onFocus: aim,
	});
}
