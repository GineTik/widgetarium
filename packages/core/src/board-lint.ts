import { normalizeBoard } from "./model.js";
import { nestingFindings } from "./surface-laws.js";
import { baseMismatch, bodySlotNamesOf, bodySlotProblems, emptyColumnsOf, isBody } from "./layouts.js";
import { ROLES, SLOT_SURFACES } from "./surface-roles.js";
import { COLLAPSES, APART, TOGGLES, NO_SURFACE, SIDES, SURFACES, SWAP, TEXT_ROLE } from "./tree.js";
import type { NodePath } from "./tree.js";
import { isObject } from "./engine/is-object.js";
import { isRawBox } from "./board-layout.js";
import type { RawBox, RawFields } from "./board-layout.js";

interface LintFinding {
	readonly path: NodePath;
	readonly message: string;
}

type RoleOfWidget = (widget: unknown) => unknown;

interface Lint {
	readonly errors: LintFinding[];
	readonly tileIds: ReadonlySet<unknown>;
	readonly roleOf: (id: unknown) => unknown;
	readonly bodySlotNames: ReadonlySet<string>;
}

const DIRECTIONS = ["row", "column", "swap"];
const SPACING_WAS = "pad";
const HEIGHT_WAS = ["height", "heights"];
const LEAF_KEYS = ["id", "ratio", "name", "hidden", "surface", "side"];
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
const PHANTOM_SAID =
	"a {dir} inside a {dir} with no surface and no heading draws as nothing, yet it changes every gap inside it: give it a surface or a heading as its first child, or move its children up into the parent";

export function lintBoard(raw: unknown, roleOfWidget: RoleOfWidget = () => null): LintFinding[] {
	if (!isObject(raw)) return [finding([], "the block holds no board")];
	const { layout } = raw;
	if (!isRawBox(layout))
		return [finding([], "layout is not a tree of boxes and leaves: write { dir, of } at the root")];
	const tiles: readonly unknown[] = Array.isArray(raw["tiles"]) ? raw["tiles"] : [];
	const widgetOf = new Map(
		tiles.map((tile) => (isObject(tile) ? [tile["id"], tile["widget"]] : [undefined, undefined])),
	);
	const lint = createLint(widgetOf, roleOfWidget, raw["base"]);
	lintNode(lint, layout, [], null);
	const nesting = nestingFindings(normalizeBoard(raw).layout, (id) => widgetNamed(widgetOf.get(id)));
	return [
		...lint.errors,
		...tiles.flatMap(slotFindings),
		...baseFindings(raw, layout, lint.roleOf),
		...nesting.map((one) => finding(one.path, `law ${one.law}: ${one.reason}`)),
	];
}

function createLint(widgetOf: ReadonlyMap<unknown, unknown>, roleOfWidget: RoleOfWidget, base: unknown): Lint {
	return {
		errors: [],
		tileIds: new Set(widgetOf.keys()),
		roleOf: (id) => roleOfWidget(widgetOf.get(id)),
		bodySlotNames: bodySlotNamesOf(base),
	};
}

function widgetNamed(widget: unknown): string | undefined {
	return typeof widget === "string" ? widget : undefined;
}

function baseFindings(raw: RawFields, layout: RawBox, roleOf: Lint["roleOf"]): LintFinding[] {
	const { base } = raw;
	if (base === undefined || base === null) return [];
	const wrong = baseMismatch(base, layout);
	const empty = emptyColumnsOf(layout);
	const started = empty.length < layout.of.length && !isBody(base);
	return [
		...(wrong ? [finding([], wrong)] : []),
		...bodySlotProblems(base, layout, roleOf).map((message) => finding([], message)),
		...(started ? empty.map((at) => finding([at], stillEmptySaid(base))) : []),
	];
}

function stillEmptySaid(base: unknown): string {
	return `the board says ${String(base)} and this region is still empty while the ones beside it hold widgets`;
}

function slotFindings(tile: unknown): LintFinding[] {
	const said = isObject(tile) ? tile : {};
	const slots = said["slots"];
	return Object.entries(isObject(slots) ? slots : {}).flatMap(([name, held]) => {
		const wrong = outOf(isObject(held) ? held : {}, "surface", SLOT_SURFACES);
		return wrong ? [finding([], `tile "${String(said["id"])}", slot "${name}": ${wrong}`)] : [];
	});
}

function finding(path: NodePath, message: string): LintFinding {
	return { path, message };
}

function lintNode(lint: Lint, node: unknown, path: NodePath, parent: RawBox | null): void {
	const said = (message: string): void => {
		lint.errors.push(finding(path, message));
	};
	if (!isObject(node)) return said("a node must be a box { dir, of } or a leaf { id }");
	const isBox = isRawBox(node);
	if (path.length === 1 && !isBox) said("a region is a box: wrap this leaf in { dir: column, of: [...] }");
	goneFindings(node).forEach(said);
	unknownKeys(node, isBox ? BOX_KEYS : LEAF_KEYS).forEach((key) =>
		said(`"${key}" is not a field a ${isBox ? "box" : "leaf"} has`),
	);
	valueFindings(node, isBox).forEach(said);
	if (!isRawBox(node)) return lintLeaf(lint, node, path);
	if (isPhantom(lint, node, path, parent)) said(PHANTOM_SAID.replace(/\{dir\}/g, String(dirOf(node))));
	node.of.forEach((child, at) => lintNode(lint, child, [...path, at], node));
}

function goneFindings(node: RawFields): string[] {
	const spacing =
		node[SPACING_WAS] === undefined
			? []
			: [`"${SPACING_WAS}" is gone: the engine spaces a box by its level, its headings and its peers, so remove it`];
	const heights = HEIGHT_WAS.filter((key) => node[key] !== undefined).map(
		(key) =>
			`"${key}" is gone: a widget is as tall as what it draws, and only a region's width is set by hand, so remove it`,
	);
	return [...spacing, ...heights];
}

const dirOf = (node: RawFields): unknown => node["dir"] ?? "column";

function isPhantom(lint: Lint, node: RawBox, path: NodePath, parent: RawBox | null): boolean {
	if (path.length < 2 || parent === null || dirOf(parent) === SWAP || dirOf(node) !== dirOf(parent)) return false;
	if (node["surface"] !== undefined && node["surface"] !== NO_SURFACE) return false;
	if (isBoxThatStandsForItself(lint, node)) return false;
	const [first] = node.of;
	return !(isObject(first) && !Array.isArray(first["of"]) && lint.roleOf(first["id"]) === TEXT_ROLE);
}

function isBoxThatStandsForItself(lint: Lint, node: RawBox): boolean {
	if (node["id"] !== undefined || node["width"] !== undefined || node["scroll"] !== undefined) return true;
	return typeof node["name"] === "string" && lint.bodySlotNames.has(node["name"]);
}

function lintLeaf(lint: Lint, node: RawFields, path: NodePath): void {
	const { id } = node;
	if (typeof id !== "string" || id === "") {
		lint.errors.push(finding(path, "a leaf needs the id of a tile"));
		return;
	}
	if (!lint.tileIds.has(id)) lint.errors.push(finding(path, `no tile in tiles has the id "${id}"`));
}

function unknownKeys(node: RawFields, known: readonly string[]): string[] {
	return Object.keys(node).filter((key) => key !== SPACING_WAS && !HEIGHT_WAS.includes(key) && !known.includes(key));
}

function valueFindings(node: RawFields, isBox: boolean): string[] {
	return [
		outOf(node, "surface", SURFACES),
		outOf(node, "side", SIDES),
		node["side"] !== undefined && node["surface"] !== APART
			? `side only means something on a divider, and this node wears ${String(node["surface"] ?? "none")}`
			: null,
		...(isBox ? boxValueFindings(node) : []),
	].filter((said): said is string => Boolean(said));
}

function boxValueFindings(node: RawFields): (string | null)[] {
	const { purpose, role, trigger } = node;
	return [
		outOf(node, "dir", DIRECTIONS),
		outOf(node, "role", ROLES),
		collapseFinding(node["collapse"]),
		node["foldable"] !== undefined ? "foldable is gone: write collapse: { into: drawer, toggle: always }" : null,
		trigger !== undefined && !/^[^/]+\/[^/]+$/.test(String(trigger))
			? 'trigger names a ref, "<tile id>/<prop>", such as "t1/open"'
			: null,
		purpose !== undefined && (typeof purpose !== "string" || purpose.trim() === "")
			? "purpose must be a sentence"
			: null,
		role !== undefined && purpose === undefined ? "a group with a role names its purpose too" : null,
		purpose !== undefined && role === undefined ? "a group with a purpose names its role too" : null,
	];
}

function collapseFinding(collapse: unknown): string | null {
	if (collapse === undefined) return null;
	const given: unknown = typeof collapse === "string" ? { into: collapse } : collapse;
	if (!isObject(given)) return `collapse is a kind, such as drawer, or { into, toggle }`;
	const unknown = Object.keys(given).filter((key) => key !== "into" && key !== "toggle");
	if (unknown.length > 0) return `collapse holds only into and toggle, not ${unknown.join(", ")}`;
	return (
		outOf(given, "into", COLLAPSES) ??
		outOf(given, "toggle", TOGGLES) ??
		(given["into"] === undefined ? "collapse names what the box becomes: into" : null)
	);
}

function outOf(node: RawFields, key: string, allowed: readonly unknown[]): string | null {
	const value = node[key];
	if (value === undefined || allowed.includes(value)) return null;
	return `${key}: "${String(value)}" is not allowed; write one of ${allowed.join(", ")}`;
}
