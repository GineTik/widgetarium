import { arrangedHeights, normalizeBoard } from "./model.js";
import { nestingFindings } from "./surface-laws.js";
import { emptyColumnsOf, patternMismatch } from "./patterns.js";
import { ROLES, SLOT_SURFACES } from "./surface-roles.js";
import { COLLAPSES, APART, TOGGLES, NO_SURFACE, SIDES, SURFACES, SWAP } from "./tree.js";

const DIRECTIONS = ["row", "column", "swap"];
const TEXT_ROLE = "text";
const SPACING_WAS = "pad";
const LEAF_KEYS = ["id", "ratio", "height", "heights", "name", "hidden", "surface", "side"];
const BOX_KEYS = [
	"dir",
	"of",
	"ratio",
	"width",
	"measure",
	"keep",
	"foldable",
	"folded",
	"collapsed",
	"collapse",
	"trigger",
	"scroll",
	"name",
	"id",
	"strip",
	"hidden",
	"surface",
	"side",
	"role",
	"purpose",
];

export function lintBoard(raw, roleOfWidget = () => null) {
	const errors = [];
	if (!raw || typeof raw !== "object") return [finding([], "the block holds no board")];
	if (!isTree(raw.layout))
		return [finding([], "layout is not a tree of boxes and leaves: write { dir, of } at the root")];
	const tiles = Array.isArray(raw.tiles) ? raw.tiles : [];
	const widgetOf = new Map(tiles.map((tile) => [tile?.id, tile?.widget]));
	const lint = { errors, tileIds: new Set(widgetOf.keys()), roleOf: (id) => roleOfWidget(widgetOf.get(id)) };
	lintNode(lint, raw.layout, [], null);
	const nesting = nestingFindings(normalizeBoard(raw).layout);
	return [
		...errors,
		...tiles.flatMap(slotFindings),
		...patternFindings(raw),
		...nesting.map((one) => finding(one.path, `law ${one.law}: ${one.reason}`)),
	];
}

function patternFindings(raw) {
	if (raw.pattern === undefined || raw.pattern === null) return [];
	const wrong = patternMismatch(raw.pattern, raw.layout);
	const empty = emptyColumnsOf(raw.layout);
	const started = empty.length < (raw.layout?.of ?? []).length;
	return [
		...(wrong ? [finding([], wrong)] : []),
		...(started
			? empty.map((at) =>
					finding(
						[at],
						`the board says ${raw.pattern} and this column is still empty while the ones beside it hold widgets`,
					),
				)
			: []),
	];
}

function slotFindings(tile) {
	return Object.entries(tile?.slots ?? {})
		.map(([name, held]) => [name, outOf(held ?? {}, "surface", SLOT_SURFACES)])
		.filter(([, said]) => said)
		.map(([name, said]) => finding([], `tile "${tile.id}", slot "${name}": ${said}`));
}

function finding(path, message) {
	return { path, message };
}

function isTree(layout) {
	return Boolean(layout) && Array.isArray(layout.of);
}

function lintNode(lint, node, path, parent) {
	const said = (message) => lint.errors.push(finding(path, message));
	if (!node || typeof node !== "object") return said("a node must be a box { dir, of } or a leaf { id }");
	const isBox = Array.isArray(node.of);
	if (path.length === 1 && !isBox) said("a region is a box: wrap this leaf in { dir: column, of: [...] }");
	if (node[SPACING_WAS] !== undefined)
		said(`"${SPACING_WAS}" is gone: the engine spaces a box by its level, its headings and its peers, so remove it`);
	unknownKeys(node, isBox ? BOX_KEYS : LEAF_KEYS).forEach((key) =>
		said(`"${key}" is not a field a ${isBox ? "box" : "leaf"} has`),
	);
	valueFindings(node, isBox).forEach(said);
	if (!isBox) return lintLeaf(lint, node, path);
	if (isPhantom(lint, node, path, parent)) said(PHANTOM_SAID.replaceAll("{dir}", dirOf(node)));
	node.of.forEach((child, at) => lintNode(lint, child, [...path, at], node));
}

const PHANTOM_SAID =
	"a {dir} inside a {dir} with no surface and no heading draws as nothing, yet it changes every gap inside it: give it a surface or a heading as its first child, or move its children up into the parent";

const dirOf = (node) => node.dir ?? "column";

function isPhantom(lint, node, path, parent) {
	if (path.length < 2 || dirOf(parent) === SWAP || dirOf(node) !== dirOf(parent)) return false;
	if (node.surface !== undefined && node.surface !== NO_SURFACE) return false;
	if (node.id !== undefined || node.width !== undefined || node.scroll !== undefined) return false;
	const first = node.of[0];
	return !(first && !Array.isArray(first.of) && lint.roleOf(first.id) === TEXT_ROLE);
}

function lintLeaf(lint, node, path) {
	if (typeof node.id !== "string" || node.id === "")
		return lint.errors.push(finding(path, "a leaf needs the id of a tile"));
	if (!lint.tileIds.has(node.id)) lint.errors.push(finding(path, `no tile in tiles has the id "${node.id}"`));
}

function unknownKeys(node, known) {
	return Object.keys(node).filter((key) => key !== SPACING_WAS && !known.includes(key));
}

function valueFindings(node, isBox) {
	return [
		outOf(node, "surface", SURFACES),
		outOf(node, "side", SIDES),
		node.side !== undefined && node.surface !== APART
			? `side only means something on a divider, and this node wears ${node.surface ?? "none"}`
			: null,
		...(isBox ? boxValueFindings(node) : leafValueFindings(node)),
	].filter(Boolean);
}

const HEIGHT_SHAPE = "height: write a number of pixels above 0";
const HEIGHTS_SHAPE =
	"heights: write { n: pixels } where n is how many stand across, a whole number from 1, and pixels is above 0";

function leafValueFindings(node) {
	const isHeightBad = node.height !== undefined && !(typeof node.height === "number" && node.height > 0);
	const isHeightsBad = node.heights !== undefined && !isArrangedHeights(node.heights);
	return [isHeightBad ? HEIGHT_SHAPE : null, isHeightsBad ? HEIGHTS_SHAPE : null];
}

function isArrangedHeights(heights) {
	const given = heights && typeof heights === "object" && !Array.isArray(heights) ? Object.entries(heights) : [];
	return (
		given.length > 0 &&
		Object.keys(arrangedHeights(heights) ?? {}).length === given.length &&
		given.every(([, px]) => typeof px === "number")
	);
}

function boxValueFindings(node) {
	return [
		outOf(node, "dir", DIRECTIONS),
		outOf(node, "role", ROLES),
		collapseFinding(node.collapse),
		node.foldable !== undefined ? "foldable is gone: write collapse: { into: drawer, toggle: always }" : null,
		node.trigger !== undefined && !/^[^/]+\/[^/]+$/.test(String(node.trigger))
			? 'trigger names a ref, "<tile id>/<prop>", such as "t1/open"'
			: null,
		node.purpose !== undefined && (typeof node.purpose !== "string" || node.purpose.trim() === "")
			? "purpose must be a sentence"
			: null,
		node.role !== undefined && node.purpose === undefined ? "a group with a role names its purpose too" : null,
		node.purpose !== undefined && node.role === undefined ? "a group with a purpose names its role too" : null,
	];
}

function collapseFinding(collapse) {
	if (collapse === undefined) return null;
	const given = typeof collapse === "string" ? { into: collapse } : collapse;
	if (!given || typeof given !== "object") return `collapse is a kind, such as drawer, or { into, toggle }`;
	const unknown = Object.keys(given).filter((key) => key !== "into" && key !== "toggle");
	if (unknown.length > 0) return `collapse holds only into and toggle, not ${unknown.join(", ")}`;
	return (
		outOf(given, "into", COLLAPSES) ??
		outOf(given, "toggle", TOGGLES) ??
		(given.into === undefined ? "collapse names what the box becomes: into" : null)
	);
}

function outOf(node, key, allowed) {
	if (node[key] === undefined || allowed.includes(node[key])) return null;
	return `${key}: "${node[key]}" is not allowed; write one of ${allowed.join(", ")}`;
}
