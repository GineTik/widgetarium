const HEX = /#[0-9a-fA-F]{3,8}\b/g;
const FUNCTIONAL_COLOUR = /\b(?:rgba?|hsla?|oklch|lab|lch)\s*\(/g;
const PLATE_PROPERTY = /(background[a-z-]*|border[a-z-]*|box-shadow|outline[a-z-]*)\s*:\s*([^;`"']+)/g;
const SHAPE_PROPERTY = /(?:radius|collapse|spacing|offset|repeat|position|size|clip|origin|attachment|width|style)/;
const NAMED_FAMILY = /font-family\s*:\s*(?![^;]*var\()/g;
const COMPUTED_FONT_SIZE = /font-size\s*:\s*(?:\d|calc\()/g;
const BARE_PAINT = /^(?:transparent|none|inherit|currentColor|unset|initial|0)$|^1px solid var\(--wg-kit-/;
const HAS_MAP_CALL = /\.map\s*\(/;
const USE_DATA_LIST = /useData\s*\(\s*([A-Za-z_$][\w$]*)\.list\s*\)/g;
const KIT_TOKEN_PREFIX = "--wg-kit-";

const WIDGETARIUM_IMPORT = /import\s+(type\s+)?\{([^}]+)\}\s+from\s+"widgetarium"/g;
const BOARD_HEADING = /<(h[12])[\s/>]/g;
const KIT_BOARD_HEADING = /<Heading\b[^>]*\b(?:level|size)=\{?["']?([12])\b/g;
const ROLES_THAT_MAY_TITLE: readonly string[] = ["text", "layout"];
const RAW_CONTROL =
	/<(button|input|select|textarea)[\s/>]|createElement\(\s*["'](button|input|select|textarea)["']|\bh\(\s*["'](button|input|select|textarea)["']/g;
const KIT_CONTROL_FOR: Readonly<Record<string, string>> = {
	button: "Button, IconButton or a pressable Row",
	input: "Field or Checkbox",
	select: "Select",
	textarea: "TextArea",
};

const ROLES_THAT_MAY_NOT_ADD: readonly string[] = ["collection", "detail"];
const ADDS_ROWS = [
	/\.pick\([^)]*["']create["']/,
	/\b(?:create|add)\w*\s*:\s*ICommand\b/,
	/implementation\s*:\s*["']@core\/rows-create["']/,
];

const RAW_CONTROL_SAID =
	"a raw control drawn by hand ({instead}); Obsidian styles every bare control with its own fill and border, so it never looks or answers like the kit — take the kit's";

export const WIDGET_CHECK_RULES = [
	"colour",
	"font",
	"unbounded",
	"role",
	"reaches",
	"heading",
	"control",
	"adds",
] as const;

type WidgetCheckRule = (typeof WIDGET_CHECK_RULES)[number];

interface CheckedCard {
	readonly role?: unknown;
}

interface WidgetCheckInput {
	readonly id: string;
	readonly source?: string;
	readonly styles?: string;
	readonly card?: CheckedCard | null;
	readonly surface?: readonly unknown[] | null;
}

interface WidgetFinding {
	readonly widget: string;
	readonly rule: WidgetCheckRule;
	readonly message: string;
}

type Finding = Omit<WidgetFinding, "widget">;

export function checkWidget({
	id,
	source = "",
	styles = "",
	card = null,
	surface = null,
}: WidgetCheckInput): WidgetFinding[] {
	const text = `${source}\n${styles}`;
	return [...colourFindings(text), ...fontFindings(text), ...sourceFindings(source, card, surface)].map((one) => ({
		widget: id,
		...one,
	}));
}

export function saidWidgetCheck(findings: readonly WidgetFinding[]): string {
	if (findings.length === 0) return "the widget is clean";
	return findings.map((one) => `${one.widget} ${one.rule}: ${one.message}`).join("\n");
}

function sourceFindings(source: string, card: CheckedCard | null, surface: readonly unknown[] | null): Finding[] {
	return [
		...unboundedFindings(source),
		...roleFindings(card),
		...reachFindings(source, surface),
		...headingFindings(source, card),
		...controlFindings(source),
		...addFindings(source, card),
	];
}

function addFindings(source: string, card: CheckedCard | null): Finding[] {
	if (!card || typeof card.role !== "string" || !ROLES_THAT_MAY_NOT_ADD.includes(card.role)) return [];
	if (!ADDS_ROWS.some((pattern) => pattern.test(source))) return [];
	return [
		{
			rule: "adds",
			message: `a ${card.role} that adds records; adding is its own widget with the composer role — place @default/add-button beside it and bind its create to this list, so the page decides where adding stands`,
		},
	];
}

function controlFindings(source: string): Finding[] {
	const tags = [...new Set([...source.matchAll(RAW_CONTROL)].map((found) => found[1] ?? found[2] ?? found[3] ?? ""))];
	if (tags.length === 0) return [];
	const instead = tags.map((tag) => `<${tag}> → ${KIT_CONTROL_FOR[tag] ?? "the kit's control"}`).join("; ");
	return [{ rule: "control", message: RAW_CONTROL_SAID.replace("{instead}", instead) }];
}

function reachFindings(source: string, surface: readonly unknown[] | null): Finding[] {
	if (!Array.isArray(surface) || surface.length === 0) return [];
	const held = new Set(surface);
	const missing = [...source.matchAll(WIDGETARIUM_IMPORT)]
		.filter((found) => !found[1])
		.flatMap((found) => (found[2] ?? "").split(","))
		.map((entry) => entry.trim().split(/\s+as\s+/)[0] ?? "")
		.filter((name) => name !== "" && !name.startsWith("type ") && !held.has(name));
	if (missing.length === 0) return [];
	return [
		{
			rule: "reaches",
			message: `${missing.join(", ")} imported from widgetarium and not on its surface; the widget will crash the moment it draws, and the plugin cannot tell you before then`,
		},
	];
}

function colourFindings(text: string): Finding[] {
	const written = [...text.matchAll(HEX), ...text.matchAll(FUNCTIONAL_COLOUR)]
		.filter((found) => !lineNamesToken(text, found.index ?? 0))
		.map((found) => found[0]);
	const said = [...written, ...borrowedPaint(text)];
	if (said.length === 0) return [];
	return [
		{
			rule: "colour",
			message: `a plate painted from outside the kit (${said[0]}); a background, a border and a shadow come from a ${KIT_TOKEN_PREFIX}* token, because the surface laws measure those and a person's theme repaints them — ink may still come from the host's own text colours`,
		},
	];
}

// TRADE-OFF: the kit declares no type tokens, so the host's font variables are the right source and only arithmetic over them is a finding
function borrowedPaint(text: string): string[] {
	return [...text.matchAll(PLATE_PROPERTY)]
		.filter((found) => !SHAPE_PROPERTY.test(found[1] ?? ""))
		.map((found) => (found[2] ?? "").trim())
		.filter((value) => !BARE_PAINT.test(value) && !value.includes(KIT_TOKEN_PREFIX));
}

function fontFindings(text: string): Finding[] {
	const families = [...text.matchAll(NAMED_FAMILY)];
	const sizes = [...text.matchAll(COMPUTED_FONT_SIZE)];
	const said = [
		families.length > 0 ? `${families.length} font-family naming a typeface` : null,
		sizes.length > 0 ? `${sizes.length} font-size computed rather than taken` : null,
	].filter((one): one is string => one !== null);
	if (said.length === 0) return [];
	return [
		{
			rule: "font",
			message: `${said.join(" and ")}; type is the host's — take a variable whole (var(--font-ui-small)) and never build a scale on top of one, because this plugin is a wrapper and their typeface wins`,
		},
	];
}

function unboundedFindings(source: string): Finding[] {
	if (!HAS_MAP_CALL.test(source)) return [];
	const listed = [...source.matchAll(USE_DATA_LIST)].map((found) => found[1]);
	if (listed.length === 0) return [];
	return [
		{
			rule: "unbounded",
			message: `${listed.join(", ")} read through list with no limit and rows are drawn from it; a list hands over a hundred rows and no more, so a widget that draws what it read must page through the rest`,
		},
	];
}

function headingFindings(source: string, card: CheckedCard | null): Finding[] {
	if (!card || mayTitle(card.role)) return [];
	const drawn = [
		...new Set([
			...[...source.matchAll(BOARD_HEADING)].map((found) => found[1]),
			...[...source.matchAll(KIT_BOARD_HEADING)].map((found) => `h${found[1]}`),
		]),
	];
	if (drawn.length === 0) return [];
	return [
		{
			rule: "heading",
			message: `${drawn.join(" and ")} drawn inside the widget; a screen and a region are titled by a markdown node standing beside this one on the board, so a title drawn in here lands inside the plate and the board cannot space it`,
		},
	];
}

function roleFindings(card: CheckedCard | null): Finding[] {
	if (!card || typeof card.role === "string") return [];
	return [
		{
			rule: "role",
			message: "the manifest names no role, so no surface law can judge it and it will always wear nothing",
		},
	];
}

function mayTitle(role: unknown): boolean {
	return typeof role === "string" && ROLES_THAT_MAY_TITLE.includes(role);
}

function lineNamesToken(text: string, at: number): boolean {
	const lineEnd = text.indexOf("\n", at);
	const line = text.slice(text.lastIndexOf("\n", at) + 1, lineEnd === -1 ? undefined : lineEnd);
	return line.includes(KIT_TOKEN_PREFIX);
}
