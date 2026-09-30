import type { TabStep, TabVerb } from "./tab-rows.js";

const NAME_TAKEN = 'A tab named "{name}" is already here.';

export interface TabStripFacts {
	readonly tabs: readonly string[];
	readonly archived: readonly string[];
	readonly selected: string;
	readonly onChange?: ((step: TabStep) => void) | undefined;
	readonly onRefuse?: ((message: string) => void) | undefined;
}

interface TabStripSetters {
	readonly setEditing: (tab: string) => void;
	readonly setDeleting: (tab: string) => void;
}

export interface TabStripVerbs {
	readonly add: () => void;
	readonly archive: (tab: string) => void;
	readonly restore: (tab: string) => void;
	readonly remove: (tab: string) => void;
	readonly select: (tab: string) => void;
	readonly rename: (was: string, node: HTMLElement | null) => void;
}

type StepPatch = Partial<Omit<TabStep, "verb">>;
type TakeStep = (verb: TabVerb, patch: StepPatch) => void;

interface LeftStrip {
	readonly tabs: readonly string[];
	readonly selected: string;
}

export function tabStripVerbsOf(facts: TabStripFacts, setters: TabStripSetters): TabStripVerbs {
	const { tabs, archived, selected } = facts;
	const step: TakeStep = (verb, patch) =>
		facts.onChange?.({ verb, tabs, archived, selected, name: selected, was: null, ...patch });
	const without = (tab: string): string[] => archived.filter((name) => name !== tab);
	return {
		add: () => addTab(facts, step, setters),
		archive: (tab) => {
			const next = afterTabLeaves(tabs, tab, [...tabs, ...archived]);
			step("archive", { tabs: next.tabs, selected: next.selected, archived: [...archived, tab], name: tab });
		},
		restore: (tab) => step("restore", { tabs: [...tabs, tab], archived: without(tab), name: tab }),
		remove: (tab) => {
			setters.setDeleting("");
			step("delete", { archived: without(tab), name: tab });
		},
		select: (tab) => step("select", { selected: tab, name: tab }),
		rename: (was, node) => renameTab({ facts, step, setters, was, node }),
	};
}

export function withTabName(sentence: string, name: string): string {
	return sentence.replace("{name}", name);
}

function addTab(facts: TabStripFacts, step: TakeStep, setters: TabStripSetters): void {
	const name = freeUntitled([...facts.tabs, ...facts.archived]);
	step("add", { tabs: [...facts.tabs, name], selected: name, name });
	setters.setEditing(name);
}

interface Renaming {
	readonly facts: TabStripFacts;
	readonly step: TakeStep;
	readonly setters: TabStripSetters;
	readonly was: string;
	readonly node: HTMLElement | null;
}

// TRADE-OFF: the node is handed in so a refused name can be put back on screen, because React keeps no text it did not write and the typed one would stand under a name nothing answers to
function renameTab({ facts, step, setters, was, node }: Renaming): void {
	const name = String(node?.textContent ?? "").trim();
	const putBack = (): void => {
		if (node) node.textContent = was;
	};
	setters.setEditing("");
	if (!name || name === was) {
		putBack();
		return;
	}
	if (facts.tabs.includes(name) || facts.archived.includes(name)) {
		putBack();
		facts.onRefuse?.(withTabName(NAME_TAKEN, name));
		return;
	}
	step("rename", { tabs: facts.tabs.map((tab) => (tab === was ? name : tab)), selected: name, name, was });
}

function freeUntitled(taken: readonly string[]): string {
	let index = 1;
	while (taken.includes(`Untitled ${index}`)) index += 1;
	return `Untitled ${index}`;
}

function afterTabLeaves(tabs: readonly string[], leaving: string, taken: readonly string[]): LeftStrip {
	const left = tabs.filter((tab) => tab !== leaving);
	const [first] = left;
	if (first === undefined) {
		const born = freeUntitled(taken);
		return { tabs: [born], selected: born };
	}
	return { tabs: left, selected: left[Math.min(tabs.indexOf(leaving), left.length - 1)] ?? first };
}
