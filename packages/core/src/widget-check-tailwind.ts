const PALETTE_PREFIX =
	"bg|text|border(?:-[trblxyse])?|ring(?:-offset)?|shadow|fill|stroke|from|via|to|outline|divide|decoration|accent|caret|placeholder";
const PALETTE_HUE =
	"slate|gray|zinc|neutral|stone|mauve|olive|mist|taupe|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
export const TAILWIND_PALETTE_CLASS = new RegExp(
	`(?<![\\w-])(?:(?:${PALETTE_PREFIX})-(?:${PALETTE_HUE})-\\d{2,3}|(?:${PALETTE_PREFIX})-(?:white|black))(?![\\w.-])`,
	"g",
);
const LEGACY_TAILWIND_ENTRY =
	/@tailwind\s+(?:base|components|utilities|variants|screens)|@import\s+(?:url\(\s*)?["']tailwindcss\/(?:base|components|utilities)["']/;
const TAILWIND_IMPORT = /@import\s+(?:url\(\s*)?["']tailwindcss(?:\/[a-z]+\.css)?["']/;
const HAND_WRITTEN_RULE = /(?:^|[{}])[ \t]*(?!(?:from|to)\s*\{)([.#[a-zA-Z*:][^{};@]*)\{/gm;
const CSS_COMMENT = /\/\*[\s\S]*?\*\//g;
const DRAFT_ID_PREFIX = "@draft/";
const EXPORTS_BLOCKS = /export\s+const\s+blocks\s*=/;

interface SheetFinding {
	readonly rule: "tailwind" | "hand-written" | "blocks";
	readonly message: string;
}

export function sheetFindings(id: string, styles: string): SheetFinding[] {
	const uncommented = styles.replace(CSS_COMMENT, "");
	return [...legacyTailwindFindings(uncommented), ...handWrittenRuleFindings(id, uncommented)];
}

export function draftBlockFindings(id: string, source: string): SheetFinding[] {
	if (!id.startsWith(DRAFT_ID_PREFIX) || EXPORTS_BLOCKS.test(source)) return [];
	return [
		{
			rule: "blocks",
			message:
				"a draft exports no blocks; add export const blocks = { BookCovers: () => <BookCovers books={BOOKS} /> } naming every block with its sample rows, so the canvas draws each one as a new widget",
		},
	];
}

function legacyTailwindFindings(styles: string): SheetFinding[] {
	if (!LEGACY_TAILWIND_ENTRY.test(styles)) return [];
	return [
		{
			rule: "tailwind",
			message:
				'Tailwind 3\'s entry points, which this engine never compiles, so not one class is drawn; open the sheet with @import "tailwindcss"; and @import "widgetarium/theme.css"; instead',
		},
	];
}

// TODO: every sheet once the catalogue's 20 hand-written sheets are Tailwind
function handWrittenRuleFindings(id: string, styles: string): SheetFinding[] {
	if (!id.startsWith(DRAFT_ID_PREFIX) && !TAILWIND_IMPORT.test(styles)) return [];
	const handWrittenSelectors = [...styles.matchAll(HAND_WRITTEN_RULE)].map((found) => (found[1] ?? "").trim());
	if (handWrittenSelectors.length === 0) return [];
	return [
		{
			rule: "hand-written",
			message: `${handWrittenSelectors.length} rule${handWrittenSelectors.length === 1 ? "" : "s"} written in the sheet (${handWrittenSelectors[0]}); the look is Tailwind classes on the element, from the kit's theme, so it moves with the block that draws it — the sheet holds only its imports and a @theme`,
		},
	];
}
