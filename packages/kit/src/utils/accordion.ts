export interface ToggleRule {
	readonly isMultiple: boolean;
	readonly isCollapsible: boolean;
}

export function openedOf(value: string | readonly string[] | undefined): readonly string[] | undefined {
	if (value === undefined) return undefined;
	if (typeof value === "string") return value === "" ? [] : [value];
	return value;
}

export function toggleOpened(opened: readonly string[], value: string, rule: ToggleRule): readonly string[] {
	const isOpen = opened.includes(value);
	if (rule.isMultiple) return isOpen ? opened.filter((held) => held !== value) : [...opened, value];
	if (!isOpen) return [value];
	return rule.isCollapsible ? [] : opened;
}
