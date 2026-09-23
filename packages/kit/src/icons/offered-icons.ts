import { GLYPHS } from "./glyphs";
import { ICON_TABLE, ICON_WORDS } from "./icon-table";

const offeredIcon = (name) => ({ name, words: ICON_WORDS[name] ?? "" });

let everyIconOffered = null;

export function offeredIcons() {
	everyIconOffered ??= Object.keys(GLYPHS)
		.concat(Object.keys(ICON_TABLE).filter((name) => !Object.hasOwn(GLYPHS, name)))
		.map(offeredIcon);
	return everyIconOffered;
}
