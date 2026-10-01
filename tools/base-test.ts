import {
	LAYOUTS,
	LAYOUT_NAMES,
	HEADING_WIDGET,
	layoutNamed,
	skeletonOf,
	sectionsOf,
	emptyColumnsOf,
	baseMismatch,
} from "../packages/core/src/layouts.js";
import { CARDS, CARD_NAMES, cardNamed, cardNode } from "../packages/core/src/patterns.js";
import { normalizeBoard, serializeBoard } from "../packages/core/src/model.js";
import { nestingFindings } from "../packages/core/src/surface-laws.js";
import type { BoardNode, BoxNode, LeafNode } from "../packages/core/src/tree-nodes.js";
import { fieldAt, fieldIn } from "./held-fields.ts";
import { present } from "./page-dom.ts";

type SerializedBoard = ReturnType<typeof serializeBoard>;

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

const LEAF_KEYS = ["id", "ratio", "height", "heights", "name", "hidden", "surface", "side"];

let failed = 0;
let checks = 0;
const check = (name: string, got: unknown, want: unknown): void => {
	checks += 1;
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`,
	);
};

const asBoard = (raw: unknown): SerializedBoard => serializeBoard(normalizeBoard(raw));
const isLeaf = (node: BoardNode): node is LeafNode => !("of" in node);
const isBox = (node: BoardNode): node is BoxNode => "of" in node;
const tileOf = (board: SerializedBoard, id: string): SerializedBoard["tiles"][number] | null =>
	board.tiles.find((tile) => tile.id === id) ?? null;
const childrenOf = (node: BoardNode): readonly BoardNode[] => (isBox(node) ? node.of : []);
const regionsOf = (board: SerializedBoard): readonly BoardNode[] => childrenOf(board.layout);
const regionAt = (board: SerializedBoard, at: number): BoardNode => present(regionsOf(board)[at], `region ${at}`);
const said = (node: BoardNode | undefined, key: string): unknown => fieldIn(node, key);

const nodesIn = (node: BoardNode, found: BoardNode[] = []): BoardNode[] => {
	found.push(node);
	for (const child of childrenOf(node)) nodesIn(child, found);
	return found;
};

const shapeOf = (section: BoardNode): string => {
	const rows = childrenOf(section).filter((child) => said(child, "dir") === "row");
	const [first] = rows;
	if (!first) return `band:${childrenOf(section).length}`;
	return `row:${childrenOf(first).length}:${childrenOf(first)
		.map((child) => said(child, "ratio") ?? 1)
		.join("-")}`;
};

check("there are bases to start from", LAYOUT_NAMES.length > 0, true);

for (const name of LAYOUT_NAMES) {
	const held = present(LAYOUTS[name], name);
	const skeleton = present(skeletonOf(name, asBoard), `the ${name} skeleton`);
	const nodes = nodesIn(skeleton.layout);
	const leaves = nodes.filter(isLeaf);
	const placed = new Set(leaves.map((leaf) => leaf.id));

	check(`${name} is a row of regions`, said(skeleton.layout, "dir"), "row");
	check(`${name} says what it suits and what it holds`, Boolean(held.suits && held.holds), true);
	check(`${name} names the width its full form needs`, typeof held.needsPx, "number");
	check(
		`${name} gives every region a role and a purpose`,
		regionsOf(skeleton).every((region) => Boolean(said(region, "role") && said(region, "purpose"))),
		true,
	);
	check(`${name} keeps exactly one region`, regionsOf(skeleton).filter((region) => said(region, "keep")).length, 1);
	check(
		`${name} writes only keys a node may carry`,
		nodes.every((node) => Object.keys(node).every((key) => (isLeaf(node) ? LEAF_KEYS : BOX_KEYS).includes(key))),
		true,
	);

	check(`${name} arrives with the text already placed`, skeleton.tiles.length > 0, true);
	check(
		`${name} places text and nothing else, so every other widget is the person's choice`,
		skeleton.tiles.every((tile) => tile.widget === HEADING_WIDGET),
		true,
	);
	check(
		`${name} draws every tile it declares`,
		skeleton.tiles.every((tile) => placed.has(tile.id)),
		true,
	);
	check(
		`${name} declares every tile it draws`,
		leaves.every((leaf) => skeleton.tiles.some((tile) => tile.id === leaf.id)),
		true,
	);
	const titles = skeleton.tiles.filter((tile) => fieldAt(tile.props, "heading", "value") === 1);
	check(`${name} carries one page title and no second one`, titles.length, 1);
	const titleColumn = nodes.find(
		(node) => isBox(node) && node.of.some((child) => isLeaf(child) && child.id === titles[0]?.id),
	);
	check(
		`${name} says under the title, in one line, what the page is`,
		titleColumn &&
			childrenOf(titleColumn).map((child) =>
				fieldAt(tileOf(skeleton, String(said(child, "id")))?.props, "tone", "value"),
			),
		["value", "caption"],
	);
	check(
		`${name} stands the title in the region the screen keeps`,
		regionsOf(skeleton).findIndex((region) => nodesIn(region).some((node) => said(node, "id") === titles[0]?.id)),
		regionsOf(skeleton).findIndex((region) => said(region, "keep")),
	);
	check(
		`${name} types every line into the tile, so nothing reads the vault before a person binds it`,
		skeleton.tiles.every((tile) => Object.values(tile.props ?? {}).every((prop) => fieldIn(prop, "from") === "typed")),
		true,
	);

	const sections = sectionsOf(held.layout);
	check(`${name} ships sections, each with a heading`, sections.length >= 3, true);
	check(
		`${name} gives every section its own heading tile`,
		sections.every((section) => skeleton.tiles.some((tile) => fieldAt(tile.props, "text", "value") === section.name)),
		true,
	);

	const shapes = new Set(
		nodes
			.filter((node) => said(node, "role") && said(node, "purpose") && isBox(node) && node.of.length > 0)
			.map(shapeOf),
	);
	check(`${name} shapes its sections more than one way`, shapes.size >= 3, true);

	const holes = nodes.filter((node) => isBox(node) && node.of.length === 0);
	check(`${name} leaves places standing empty, waiting for a widget`, holes.length >= 3, true);
	check(
		`${name} says of every empty place what it is for`,
		holes.every((place) => Boolean(said(place, "role") && said(place, "purpose"))),
		true,
	);

	check(`${name} breaks no surface law`, nestingFindings(normalizeBoard(skeleton).layout), []);
}

const skeleton = present(skeletonOf("workspace", asBoard), "the workspace skeleton");
check("a skeleton carries the base it came from", skeleton.base, "workspace");
check("and cuts the page into its regions", regionsOf(skeleton).length, 3);
check("the navigation rail is set apart", said(regionAt(skeleton, 0), "surface"), "apart");
check(
	"and collapses, because a pane that cannot hold its place is a drawer",
	fieldAt(regionAt(skeleton, 0), "collapse", "into"),
	"drawer",
);
check("the kept region wears no surface of its own", "surface" in regionAt(skeleton, 1), false);
check("a skeleton opens as a page, never as a block in prose", skeleton.mode, "expanded");
check("it is a board block, stamped with the format an older plugin refuses", skeleton.v, 2);
check("a name nobody serves has no skeleton", skeletonOf("nonsense", asBoard), null);
check("and is not a base", layoutNamed("nonsense"), null);
check(
	"two skeletons of one base mint the same ids, so a note is the same however often it is taken",
	JSON.stringify(skeletonOf("workspace", asBoard)),
	JSON.stringify(skeleton),
);

const asked = { v: 2, tiles: [], base: "workspace", layout: skeleton.layout };
check("a board keeps the base it was cut from", normalizeBoard(asked).base, "workspace");
check("and writes it back", serializeBoard(normalizeBoard(asked)).base, "workspace");
check("a skeleton matches the base it came from", baseMismatch("workspace", skeleton.layout), null);
check(
	"a board with the wrong region count is named",
	baseMismatch("workspace", { dir: "row", of: regionsOf(skeleton).slice(0, 2) })?.includes("3 regions"),
	true,
);
check(
	"a region holding the wrong role is named",
	baseMismatch("workspace", {
		dir: "row",
		of: [{ ...regionAt(skeleton, 0), role: "media" }, regionAt(skeleton, 1), regionAt(skeleton, 2)],
	})?.includes("should hold navigation"),
	true,
);
check(
	"a base nobody serves is refused rather than guessed",
	(baseMismatch("nonsense", skeleton.layout)?.length ?? 0) > 0,
	true,
);

check(
	"a region with nothing in it is reported by index",
	emptyColumnsOf({ of: [{ of: [] }, { of: [{}] }, { of: [] }] }),
	[0, 2],
);

check("the card shapes survived the removal of the page patterns", CARD_NAMES.length > 0, true);
for (const name of CARD_NAMES) {
	check(`${name} is a card shape, not a page`, Boolean(CARDS[name]?.parts), true);
	check(`${name} draws a node`, Boolean(cardNode(name)), true);
}
check("a name every object inherits is no card shape", cardNamed("constructor"), null);
check("and draws no node", cardNode("toString"), null);

console.log(failed ? `\nbase gate: ${failed} of ${checks} failed` : `\nbase gate: clean, ${checks} checks`);
process.exit(failed ? 1 : 0);
