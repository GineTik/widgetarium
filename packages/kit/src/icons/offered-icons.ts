import { GLYPHS } from "./glyphs";
import { ICON_TABLE, ICON_WORDS } from "./icon-table";

export interface OfferedIcon {
	readonly name: string;
	readonly words: string;
}

const SPOKEN_ICONS: Readonly<Record<string, string>> = ICON_WORDS;

let everyIconOffered: readonly OfferedIcon[] | null = null;

export function offeredIcons(): readonly OfferedIcon[] {
	everyIconOffered ??= Object.keys(GLYPHS)
		.concat(Object.keys(ICON_TABLE).filter((name) => !Object.hasOwn(GLYPHS, name)))
		.map(offeredIcon);
	return everyIconOffered;
}

function offeredIcon(name: string): OfferedIcon {
	return { name, words: (Object.hasOwn(SPOKEN_ICONS, name) ? SPOKEN_ICONS[name] : undefined) ?? "" };
}
