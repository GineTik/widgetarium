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
const ROLES_THAT_MAY_TITLE = ["text", "layout"];

export const WIDGET_CHECK_RULES = ["colour", "font", "unbounded", "role", "reaches", "heading"];

export function checkWidget({ id, source = "", styles = "", card = null, surface = null }) {
	const text = `${source}\n${styles}`;
	return [
		...colourFindings(text),
		...fontFindings(text),
		...unboundedFindings(source),
		...roleFindings(card),
		...reachFindings(source, surface),
		...headingFindings(source, card),
	].map((one) => ({ widget: id, ...one }));
}

export function saidWidgetCheck(findings) {
	if (findings.length === 0) return "the widget is clean";
	return findings.map((one) => `${one.widget} ${one.rule}: ${one.message}`).join("\n");
}

function reachFindings(source, surface) {
	if (!Array.isArray(surface) || surface.length === 0) return [];
	const held = new Set(surface);
	const missing = [...source.matchAll(WIDGETARIUM_IMPORT)]
		.filter((found) => !found[1])
		.flatMap((found) => found[2].split(","))
		.map((entry) => entry.trim().split(/\s+as\s+/)[0])
		.filter((name) => name !== "" && !name.startsWith("type ") && !held.has(name));
	if (missing.length === 0) return [];
	return [
		{
			rule: "reaches",
			message: `${missing.join(", ")} imported from widgetarium and not on its surface; the widget will crash the moment it draws, and the plugin cannot tell you before then`,
		},
	];
}

function colourFindings(text) {
	const written = [...text.matchAll(HEX), ...text.matchAll(FUNCTIONAL_COLOUR)]
		.filter((found) => !lineNamesToken(text, found.index))
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
function borrowedPaint(text) {
	return [...text.matchAll(PLATE_PROPERTY)]
		.filter((found) => !SHAPE_PROPERTY.test(found[1]))
		.map((found) => found[2].trim())
		.filter((value) => !BARE_PAINT.test(value) && !value.includes(KIT_TOKEN_PREFIX));
}

function fontFindings(text) {
	const families = [...text.matchAll(NAMED_FAMILY)];
	const sizes = [...text.matchAll(COMPUTED_FONT_SIZE)];
	const said = [
		families.length > 0 ? `${families.length} font-family naming a typeface` : null,
		sizes.length > 0 ? `${sizes.length} font-size computed rather than taken` : null,
	].filter(Boolean);
	if (said.length === 0) return [];
	return [
		{
			rule: "font",
			message: `${said.join(" and ")}; type is the host's — take a variable whole (var(--font-ui-small)) and never build a scale on top of one, because this plugin is a wrapper and their typeface wins`,
		},
	];
}

function unboundedFindings(source) {
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

function headingFindings(source, card) {
	if (!card || ROLES_THAT_MAY_TITLE.includes(card.role)) return [];
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

function roleFindings(card) {
	if (!card || typeof card.role === "string") return [];
	return [
		{
			rule: "role",
			message: "the manifest names no role, so no surface law can judge it and it will always wear nothing",
		},
	];
}

function lineNamesToken(text, at) {
	const line = text.slice(
		text.lastIndexOf("\n", at) + 1,
		text.indexOf("\n", at) === -1 ? undefined : text.indexOf("\n", at),
	);
	return line.includes(KIT_TOKEN_PREFIX);
}
