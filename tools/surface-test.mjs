import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { bundleOf, findBrowser } from "./harness.mjs";
import { buildMirror } from "./mirror.mjs";

buildMirror();
const { normalizeBoard, serializeBoard } = await import("./.mjs-cache/model.mjs");
const {
	allEdges,
	laid,
	laidRegion,
	levelAt,
	MIN_CORNER_PX,
	MIN_GAP_PX,
	pairGapOf,
	PLATE_CORNER_PX,
	plateOf,
	regionSurfaceOf,
	STEP_PX,
	SURFACE_PAD_PX,
} = await import("./.mjs-cache/tree.mjs");
const { nestingFindings, surfaceChoicesAt, surfaceVerdicts, widgetOfTiles, wornSurfaceAt } =
	await import("./.mjs-cache/surface-laws.mjs");
const { isKnownRole, plateRefusal, ROLES, slotSurfaceOf } = await import("./.mjs-cache/surface-roles.mjs");
const { platesAtCell } = await import("./.mjs-cache/kit-surface.mjs");
const { gapVarsOf } = await import("./.mjs-cache/tree.mjs");
const { literalGapsIn } = await import("./gap-audit.mjs");
const { lintBoard } = await import("./.mjs-cache/board-lint.mjs");
const { measuredPathOf } = await import("./.mjs-cache/surface-contract.mjs");
const { colorOf, contrastOf, lightnessOf } = await import("./.mjs-cache/color-math.mjs");

let failed = 0;
function check(label, got, want) {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK " : "!! "} ${label}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`,
	);
}
const near = (one, other, slack = 1) => Math.abs(one - other) <= slack;

console.log("— a surface is read from the note and written back, a pad is read and never written —\n");

const written = normalizeBoard({
	tiles: [
		{ id: "a", widget: "@x/a" },
		{ id: "b", widget: "@x/b" },
	],
	layout: {
		dir: "row",
		of: [
			{ dir: "column", collapse: { into: "drawer", toggle: "always" }, surface: "none", of: [{ id: "a" }] },
			{
				dir: "column",
				keep: true,
				pad: "l",
				of: [
					{
						dir: "column",
						surface: "object",
						pad: "huge",
						of: [
							{ id: "b", surface: "apart", side: "start" },
							{ id: "b2", surface: "glow" },
						],
					},
				],
			},
		],
	},
});
check(
	"a known surface and side survive, an old object is read as a group, an unknown surface and every pad are dropped",
	serializeBoard(written).layout,
	{
		dir: "row",
		of: [
			{ dir: "column", collapse: { into: "drawer", toggle: "always" }, surface: "none", of: [{ id: "a" }] },
			{
				dir: "column",
				keep: true,
				of: [{ dir: "column", surface: "group", of: [{ id: "b", surface: "apart", side: "start" }, { id: "b2" }] }],
			},
		],
	},
);
check("an explicit none takes the sidebar's default line away", regionSurfaceOf(written.layout, 0).surface, "none");
check(
	"a sidebar holding something is divided from the kept column by default",
	regionSurfaceOf(
		normalizeBoard({
			tiles: [],
			layout: {
				dir: "row",
				of: [
					{ dir: "column", collapse: { into: "drawer", toggle: "always" }, of: [{ id: "x" }] },
					{ dir: "column", keep: true, of: [] },
				],
			},
		}).layout,
		0,
	),
	{ surface: "apart", side: "end" },
);

console.log("\n— the layout gives a surface its padding and a level its gap —\n");

const painted = laid(
	{ dir: "column", surface: "group", of: [{ id: "p" }, { id: "q", surface: "apart", side: "start" }] },
	600,
	{ ask: () => ({}), path: [1, 0], edges: allEdges(8), level: 1 },
);
check(
	"children stand inside the padding",
	painted.of.map((child) => child.width),
	[600 - 2 * SURFACE_PAD_PX, 600 - 2 * SURFACE_PAD_PX],
);
check("a box one level under its region carries the second step", painted.gap, STEP_PX[1]);
check(
	"a line inside a filled box reaches both of its edges",
	[painted.of[1].dividerBefore, painted.of[1].dividerAfter],
	[SURFACE_PAD_PX, SURFACE_PAD_PX],
);
const loose = laid(
	{
		dir: "column",
		of: [{ id: "top" }, { dir: "row", of: [{ id: "d", surface: "apart" }, { id: "e" }] }, { id: "bottom" }],
	},
	600,
	{
		ask: () => ({}),
		path: [1],
		edges: allEdges(8),
	},
);
check(
	"a line in a middle row has no surface edge to reach",
	[loose.of[1].of[0].dividerBefore, loose.of[1].of[0].dividerAfter],
	[null, null],
);

console.log("\n— what the widget is told stands above it —\n");

const twoGroups = laidRegion(
	{
		dir: "row",
		of: [
			{
				dir: "column",
				surface: "group",
				of: [{ dir: "column", surface: "group", of: [{ id: "deep" }] }, { id: "shallow" }],
			},
		],
	},
	0,
	600,
	{ ask: () => ({}) },
);
const deep = twoGroups.node.of[0].of[0];
const shallow = twoGroups.node.of[1];
check("a leaf two groups down is told both of them", [deep.plates, deep.underSurface], [2, "group"]);
check("a leaf inside the one group is told the one", [shallow.plates, shallow.underSurface], [1, "group"]);
check("and the cell hands the kit exactly that", platesAtCell(deep), { surface: "group", levels: 2, ownPlates: 0 });
check("so a widget under two groups may paint no plate of its own", plateRefusal(platesAtCell(deep), "group").law, "5");
check("while one group above still leaves it a plate", plateRefusal(platesAtCell(shallow), "group"), null);
console.log("\n— an indicators region lays a group on each widget in it —\n");

const REGION_ROLE_OF = { note: "text", stat: "indicator", pick: "control", own: "indicator", inGroup: "indicator" };
const askRole = (id) => ({ role: REGION_ROLE_OF[id] });
const aside = (role) =>
	laidRegion(
		{
			dir: "row",
			of: [
				{
					dir: "column",
					role,
					of: [
						{ id: "note" },
						{ dir: "column", name: "Numbers", of: [{ id: "stat" }, { id: "pick" }] },
						{ id: "own", surface: "none" },
						{ dir: "column", surface: "group", of: [{ id: "inGroup" }] },
					],
				},
			],
		},
		0,
		320,
		{ ask: askRole },
	).node;
const wornIn = (node) => (node.kind === "leaf" ? [[node.id, node.surface ?? null]] : node.of.flatMap(wornIn));
check(
	"a widget in it wears a group however deep its section, a heading and a control stay bare",
	Object.fromEntries(wornIn(aside("indicators"))),
	{ note: null, stat: "group", pick: null, own: "none", inGroup: null },
);
check("the same region under another role lays nothing", Object.fromEntries(wornIn(aside("collection"))), {
	note: null,
	stat: null,
	pick: null,
	own: "none",
	inGroup: null,
});
check("the laid group counts as the widget's plate", aside("indicators").of[1].of[0].plates, 1);

const noPlates = laidRegion({ dir: "row", of: [{ dir: "column", of: [{ id: "flat" }] }] }, 0, 600, {
	ask: () => ({}),
});

const twiceWrong = {
	dir: "row",
	of: [
		{
			dir: "column",
			surface: "group",
			of: [{ dir: "column", surface: "group", of: [{ id: "both", surface: "group" }] }],
		},
	],
};
const namedOnce = nestingFindings(twiceWrong).filter((one) => String(one.path) === "0,0,0");
check(
	"a node the laws refuse is named once, by the same answer the kit gets",
	namedOnce.map((one) => one.law),
	[plateRefusal({ surface: "group", levels: 2 }, "group").law],
);
check("a leaf on the page is told nothing stands above it", platesAtCell(noPlates.node.of[0]), {
	surface: "none",
	levels: 0,
	ownPlates: 0,
});

console.log("\n— the laws, one by one —\n");

const PAGE = "rgb(255, 255, 255)";
const PRESETS = {
	fill: "color(srgb 0.13 0.13 0.13 / 0.04)",
	raise: "rgb(255, 255, 255)",
	edge: "color(srgb 0.13 0.13 0.13 / 0.09)",
};
const INK = "rgb(34, 34, 34)";
const plain = (depth = 0) => ({ depth, fills: [], texts: [INK] });
const tilesOf = (pairs) => pairs.map(([id, widget]) => ({ id, widget }));
const verdictAt = (found, at) => found.verdicts.find((one) => one.path.join("/") === at);
const rootWith = (main, left = []) => ({
	dir: "row",
	of: [
		{ dir: "column", collapse: { into: "drawer", toggle: "always" }, of: left },
		{ dir: "column", keep: true, of: main },
	],
});

const ROLE_OF = {
	"@x/stat": "indicator",
	"@x/heat": "indicator",
	"@x/kanban": "collection",
	"@x/search": "control",
	"@x/nav": "navigation",
	"@x/composer": "composer",
	"@x/words": "indicator",
	"@x/mystery": null,
	"@x/typo": "navigaton",
	"@x/title": "text",
};
const roleOf = (widget) => ROLE_OF[widget] ?? null;
const group = (role, purpose, of, extra = {}) => ({
	dir: "column",
	role,
	...(purpose ? { purpose } : {}),
	of,
	...extra,
});
const measuredOf = (tiles, extents) => ({
	theme: "light",
	page: PAGE,
	presets: PRESETS,
	tiles,
	...(extents ? { extents } : {}),
});
const judge = (layout, tiles, measuredTiles, extents) =>
	surfaceVerdicts({
		layout,
		tiles: tilesOf(tiles),
		measured: measuredTiles ? measuredOf(measuredTiles, extents) : null,
		roleOf,
	});
const lawOf = (found, at) => [verdictAt(found, at).advised, verdictAt(found, at).law];

const dashboard = judge(
	rootWith(
		[
			group("indicators", "How the habit is going", [{ id: "s1" }, { id: "s2" }, { id: "s3" }]),
			group("detail", "When it was kept", [{ id: "heat" }, { id: "search" }]),
		],
		[{ id: "nav" }],
	),
	[
		["s1", "@x/stat"],
		["s2", "@x/stat"],
		["s3", "@x/stat"],
		["heat", "@x/heat"],
		["search", "@x/search"],
		["nav", "@x/nav"],
	],
	{ s1: plain(), s2: plain(), s3: plain(), heat: plain(), search: plain(), nav: plain() },
);
check("law D1: a sidebar beside the kept column is divided", lawOf(dashboard, "0"), ["apart", "D1"]);
check("law D2: navigation that is not a pane at a row's edge is spaced", lawOf(dashboard, "0/0"), ["none", "D2"]);
check("a group of indicators answering one question wears the fill its role offers", lawOf(dashboard, "1/0"), [
	"group",
	"9",
]);
check(
	"law R4: a single widget inside that plate is its content and wears no plate of its own",
	lawOf(dashboard, "1/0/0"),
	["none", "R4"],
);
check("law R2: a control wears no surface of its own", lawOf(dashboard, "1/1/1"), ["none", "R2"]);
check(
	"the verdict carries the role and the purpose it was judged by",
	[verdictAt(dashboard, "1/0").role, verdictAt(dashboard, "1/0").purpose],
	["indicators", "How the habit is going"],
);

const lonely = judge(
	rootWith([
		group("detail", "The one thing open", [
			group("indicators", "How it is going", [{ id: "n1" }, { id: "n2" }]),
			{ id: "body" },
		]),
		{ id: "aside" },
	]),
	[
		["n1", "@x/stat"],
		["n2", "@x/stat"],
		["body", "@x/heat"],
		["aside", "@x/heat"],
	],
	{ n1: plain(), n2: plain(), body: plain(), aside: plain() },
);
check("law R: a box repeating nothing beside it and holding no repeat wears no plate", lawOf(lonely, "1/0"), [
	"none",
	"R",
]);
check(
	"law R: the stats it holds repeat one another, so their box is a list and earns the group",
	lawOf(lonely, "1/0/0"),
	["group", "9"],
);

const allPlated = judge(
	rootWith([
		group("detail", "The one thing open", [
			group("indicators", "How it is going", [{ id: "p1" }, { id: "p2" }]),
			group("indicators", "How the other is going", [{ id: "p3" }, { id: "p4" }]),
		]),
		{ id: "aside2" },
	]),
	[
		["p1", "@x/stat"],
		["p2", "@x/stat"],
		["p3", "@x/stat"],
		["p4", "@x/stat"],
		["aside2", "@x/heat"],
	],
	{ p1: plain(), p2: plain(), p3: plain(), p4: plain(), aside2: plain() },
);
check("law R: a box holding two peers is a list, and a list is offered only the group", lawOf(allPlated, "1/0"), [
	"group",
	"9",
]);
check("and the peers inside that list keep their plates, white on its grey", lawOf(allPlated, "1/0/0"), ["group", "9"]);

const peersAmongBare = judge(
	rootWith([
		group("detail", "The one thing open", [
			group("indicators", "How it is going", [{ id: "q1" }, { id: "q2" }]),
			group("indicators", "How the other is going", [{ id: "q3" }, { id: "q4" }]),
			{ id: "caption" },
		]),
		{ id: "aside3" },
	]),
	[
		["q1", "@x/stat"],
		["q2", "@x/stat"],
		["q3", "@x/stat"],
		["q4", "@x/stat"],
		["caption", "@x/text"],
		["aside3", "@x/heat"],
	],
	{ q1: plain(), q2: plain(), q3: plain(), q4: plain(), caption: plain(), aside3: plain() },
);
check("peers inside a plate with something bare beside them are plated", lawOf(peersAmongBare, "1/0/0"), [
	"group",
	"9",
]);

const FILLING = { "1/0": { w: 800, h: 600 }, "1/0/0": { w: 760, h: 570 } };
const ROOMY = { "1/0": { w: 800, h: 600 }, "1/0/0": { w: 500, h: 570 } };
const sameShape = (extents) =>
	judge(
		rootWith([
			group("detail", "The one thing open", [
				group("indicators", "How it is going", [{ id: "q1" }, { id: "q2" }]),
				group("indicators", "How the other is going", [{ id: "q3" }, { id: "q4" }]),
				{ id: "caption" },
			]),
			{ id: "aside3" },
		]),
		[
			["q1", "@x/stat"],
			["q2", "@x/stat"],
			["q3", "@x/stat"],
			["q4", "@x/stat"],
			["caption", "@x/text"],
			["aside3", "@x/heat"],
		],
		{ q1: plain(), q2: plain(), q3: plain(), q4: plain(), caption: plain(), aside3: plain() },
		extents,
	);

check("law P3: a plate filling the plate around it wears none", lawOf(sameShape(FILLING), "1/0/0"), ["none", "P3"]);
check(
	"the reason says how much of its parent it fills",
	verdictAt(sameShape(FILLING), "1/0/0").reason.includes("95%"),
	true,
);
check("the same shape with room around it keeps its plate", lawOf(sameShape(ROOMY), "1/0/0"), ["group", "9"]);
check("with no extents measured P3 cannot speak", lawOf(sameShape(undefined), "1/0/0"), ["group", "9"]);

const titled = judge(
	rootWith([
		{ id: "h1" },
		group("indicators", "How it is going", [{ id: "h2" }, { id: "n1" }, { id: "n2" }]),
		{ id: "aside4" },
	]),
	[
		["h1", "@x/title"],
		["h2", "@x/title"],
		["n1", "@x/stat"],
		["n2", "@x/stat"],
		["aside4", "@x/heat"],
	],
	{ h1: plain(), h2: plain(), n1: plain(), n2: plain(), aside4: plain() },
);
check(
	"a heading first in a region reads as the section title",
	verdictAt(titled, "1/0").reason.includes("section title"),
	true,
);
check(
	"a heading first in a box inside a region reads as that group's title",
	verdictAt(titled, "1/1/0").reason.includes("group's title"),
	true,
);
check("either way it wears nothing", [lawOf(titled, "1/0")[0], lawOf(titled, "1/1/0")[0]], ["none", "none"]);

const undeclared = judge(
	rootWith([
		group("detail", "", [{ id: "a" }, { id: "b" }]),
		group(undefined, "Something", [{ id: "c" }, { id: "d" }]),
		{ id: "e" },
	]),
	[
		["a", "@x/stat"],
		["b", "@x/stat"],
		["c", "@x/stat"],
		["d", "@x/stat"],
		["e", "@x/mystery"],
	],
	{ a: plain(), b: plain(), c: plain(), d: plain(), e: plain() },
);
check("law R1: a group with no purpose is not judged", lawOf(undeclared, "1/0"), ["none", "R1"]);
check("law R1: a group with no role is not judged", lawOf(undeclared, "1/1"), ["none", "R1"]);
check("law R1: a widget whose manifest names no role is not judged", lawOf(undeclared, "1/2"), ["none", "R1"]);
const misspelled = judge(
	rootWith([{ id: "t" }, { id: "u" }]),
	[
		["t", "@x/typo"],
		["u", "@x/stat"],
	],
	{ t: plain(), u: plain() },
);
check(
	"and a role the plugin does not know is named, not taken for a missing one",
	verdictAt(misspelled, "1/0").reason.includes('"navigaton"'),
	true,
);

const boards = judge(
	rootWith([group("detail", "The work in flight", [{ id: "list" }, { id: "s1" }]), { id: "kanban2" }, { id: "s2" }]),
	[
		["list", "@x/kanban"],
		["s1", "@x/stat"],
		["kanban2", "@x/kanban"],
		["s2", "@x/kanban"],
	],
	{
		list: plain(),
		kanban2: { depth: 2, fills: [{ kind: "container", color: "color(srgb 0.95 0.95 0.95)" }], texts: [INK] },
		s1: plain(),
		s2: plain(),
	},
);
check("law R: a collection repeating nothing beside it wears no plate", lawOf(boards, "1/0/0"), ["none", "R"]);
check(
	"law 5: a collection whose widget is two containers deep cannot be wrapped",
	verdictAt(boards, "1/1").candidates[0].reasons.some((reason) => reason.startsWith("- 3 containers deep")),
	true,
);
check("law 10: nothing passed, so nothing is worn", lawOf(boards, "1/1"), ["none", "10"]);
check(
	"law 7: a fill the eye cannot tell from the surface is named",
	verdictAt(boards, "1/1").candidates[0].reasons.some((reason) => reason.startsWith("- kanban2 holds a container")),
	true,
);

const composers = judge(
	rootWith([group("detail", "A conversation", [{ id: "reply" }, { id: "s1" }]), { id: "reply2" }, { id: "s2" }]),
	[
		["reply", "@x/composer"],
		["s1", "@x/composer"],
		["reply2", "@x/composer"],
		["s2", "@x/composer"],
	],
	{ reply: plain(), s1: plain(), reply2: plain(), s2: plain() },
);
check("a composer at the top of a region is given a plate", lawOf(composers, "1/1"), ["group", "9"]);
check(
	"law N: inside a fill a composer is offered a fill",
	[verdictAt(composers, "1/0/0").candidates.map((one) => one.surface), verdictAt(composers, "1/0/0").advised],
	[["group"], "group"],
);
check(
	"and the fill inside a fill lands one step darker",
	lightnessOf(verdictAt(composers, "1/0/0").colour) < lightnessOf(verdictAt(composers, "1/0").colour),
	true,
);

const inked = (texts) =>
	judge(
		rootWith([group("indicators", "Words", [{ id: "words" }, { id: "more" }]), { id: "other" }]),
		[
			["words", "@x/words"],
			["more", "@x/words"],
			["other", "@x/stat"],
		],
		{
			words: { depth: 0, fills: [], texts },
			more: plain(),
			other: plain(),
		},
	);
check(
	"law 8: text faint on the page on purpose may stay faint on a surface",
	verdictAt(inked(["rgb(171, 171, 171)"]), "1/0").advised,
	"group",
);
check(
	"law 8: text that read at 4.5:1 on the page may not drop under it",
	verdictAt(inked(["rgb(118, 118, 118)"]), "1/0").candidates[0].reasons.some((reason) => reason.includes("(law 8)")),
	true,
);

const panes = judge(
	rootWith([
		{
			dir: "row",
			role: "detail",
			purpose: "Library and its detail",
			of: [{ id: "nav", width: 280 }, group("detail", "The pick", [{ id: "s1" }, { id: "s2" }])],
		},
	]),
	[
		["nav", "@x/nav"],
		["s1", "@x/stat"],
		["s2", "@x/stat"],
	],
	{ nav: plain(), s1: plain(), s2: plain() },
);
check(
	"law D2: navigation at the edge of a row is divided on the side facing the rest",
	[verdictAt(panes, "1/0/0").advised, verdictAt(panes, "1/0/0").side],
	["apart", "end"],
);

const blind = judge(
	rootWith([group("detail", "A", [{ id: "t" }, { id: "u" }]), { id: "v" }]),
	[
		["t", "@x/stat"],
		["u", "@x/stat"],
		["v", "@x/stat"],
	],
	null,
);
check("an unmeasured board is still decided, because the tree answers on its own", lawOf(blind, "1/0"), ["group", "9"]);
check(
	"and says the colours wait for the drawing",
	verdictAt(blind, "1/0").candidates[0].reasons[0].includes("once the board has been drawn"),
	true,
);

const nested = surfaceVerdicts({
	layout: rootWith([
		{
			dir: "column",
			surface: "group",
			of: [
				{ dir: "column", surface: "group", of: [{ id: "x" }] },
				{ dir: "column", surface: "group", of: [{ id: "y", surface: "group" }] },
			],
		},
		{
			dir: "column",
			surface: "group",
			of: [
				{ id: "z", surface: "apart" },
				{ id: "w", surface: "group" },
			],
		},
	]),
	tiles: [],
	measured: null,
});
check(
	"the gate names a third surface deep and every plate repeating nothing, one law per node",
	nested.nesting.map((one) => `${one.path.join("/")} ${one.law}`),
	["1/0 R", "1/0/0 R", "1/0/1 R", "1/0/1/0 5", "1/1 R", "1/1/1 R"],
);

console.log("\n— the layout linter —\n");

const boardWith = (main, tiles = ["a", "b", "c"]) => ({
	tiles: tiles.map((id) => ({ id, widget: "@x/stat" })),
	layout: rootWith(main),
});
const lintSaid = (board, roles = () => null) =>
	lintBoard(board, roles).map((one) => `${one.path.join("/")} ${one.message}`);
const heightSaid = (leaf) => lintSaid(boardWith([leaf])).filter((line) => line.includes("height"));
check("a widget's heights per arrangement pass lint", heightSaid({ id: "a", height: 86, heights: { 1: 180 } }), []);
check(
	"a height that is not pixels, and heights that are not { n: pixels }, are named",
	[
		heightSaid({ id: "a", height: "tall" }).length,
		heightSaid({ id: "a", heights: [180] }).length,
		heightSaid({ id: "a", heights: { 0: 180 } }).length,
		heightSaid({ id: "a", heights: { 1: -5 } }).length,
	],
	[1, 1, 1, 1],
);
check(
	"a valid layout gives no errors",
	lintSaid(
		boardWith([group("indicators", "How it goes", [{ id: "a" }, { id: "b", surface: "group" }], { surface: "group" })]),
	),
	[],
);
check(
	"a value outside its list is named with the list it must come from",
	lintSaid(boardWith([{ dir: "row", surface: "grey", of: [{ id: "a" }] }])),
	['1/0 surface: "grey" is not allowed; write one of group, apart, none'],
);
check(
	"a group stands on the page and on a group alike",
	[
		lintSaid(boardWith([{ dir: "column", surface: "group", of: [{ id: "a", surface: "group" }, { id: "b" }] }])),
		lintSaid(boardWith([{ id: "a", surface: "group" }, { id: "b" }])),
		lintSaid(
			boardWith(
				[
					{ dir: "column", surface: "group", of: [{ id: "a", surface: "group" }, { id: "b" }] },
					{ dir: "column", surface: "group", of: [{ id: "c", surface: "group" }, { id: "d" }] },
				],
				["a", "b", "c", "d"],
			),
		),
	],
	[[], [], []],
);
const slotted = normalizeBoard({
	tiles: [
		{
			id: "k",
			widget: "@x/kanban",
			slots: { card: { surface: "group" }, lane: { widget: "@x/lane", surface: "glow" } },
		},
	],
	layout: rootWith([{ id: "k" }]),
});
check(
	"a slot's surface is read and written back without a widget, and a surface outside the slot's list is dropped",
	serializeBoard(slotted).tiles[0].slots,
	{ card: { surface: "group" }, lane: { widget: "@x/lane" } },
);
check(
	"lint names a slot surface outside the list",
	lintSaid({
		tiles: [{ id: "k", widget: "@x/kanban", slots: { card: { surface: "glow" } } }],
		layout: rootWith([{ id: "k" }]),
	}),
	[' tile "k", slot "card": surface: "glow" is not allowed; write one of group, none'],
);
check(
	"the tile's pick wins over the manifest's default, and a slot that says nothing wears nothing",
	[
		slotSurfaceOf({ surface: "group" }, { surface: "none" }),
		slotSurfaceOf({ surface: "group" }, {}),
		slotSurfaceOf({}, null),
		slotSurfaceOf({ surface: "apart" }, null),
	],
	["none", "group", "none", "none"],
);
check("a widget one level under its region reads its gaps from the same steps the board is laid by", gapVarsOf(1), {
	"--wg-gap-items": `${STEP_PX[1]}px`,
	"--wg-gap-parts": `${STEP_PX[2]}px`,
	"--wg-gap-cards": `${Math.max(STEP_PX[1] - SURFACE_PAD_PX, MIN_GAP_PX)}px`,
});
check(
	"the gap audit names a gap written as a number and passes the engine's variables and other tokens",
	literalGapsIn(
		".a { gap: 8px; }\n.b { gap: var(--wg-gap-cards); }\n.c { row-gap: 1rem }\n.d { gap: var(--size-4-2, 8px) }",
	).map((one) => `${one.line} ${one.said}`),
	["1 gap: 8px", "3 row-gap: 1rem"],
);
check(
	"a pad is refused by name, because the engine spaces every box itself",
	lintSaid(boardWith([{ dir: "row", pad: "l", of: [{ id: "a" }] }])),
	['1/0 "pad" is gone: the engine spaces a box by its level, its headings and its peers, so remove it'],
);
check(
	"an unknown field, an unknown role, a side off a divider and a lone purpose are each named",
	lintSaid(
		boardWith([
			{
				dir: "row",
				padd: "m",
				role: "detial",
				purpose: "x",
				of: [
					{ id: "a", side: "end" },
					{ dir: "column", purpose: "y", of: [{ id: "b" }] },
				],
			},
		]),
	),
	[
		'1/0 "padd" is not a field a box has',
		`1/0 role: "detial" is not allowed; write one of ${ROLES.join(", ")}`,
		"1/0/0 side only means something on a divider, and this node wears none",
		"1/0/1 a group with a purpose names its role too",
	],
);
const collapseLint = (collapse, extra = {}) =>
	lintSaid(
		boardWith([
			{
				dir: "row",
				of: [
					{ dir: "column", ...extra, ...(collapse === undefined ? {} : { collapse }), of: [{ id: "a" }] },
					{ id: "b" },
				],
			},
		]),
	);
check(
	"collapse is read whole: the old foldable, a kind it cannot become, a toggle it cannot use and a key it does not hold are each named",
	[
		collapseLint(undefined, { foldable: true }),
		collapseLint({ into: "popover", toggle: "always" }),
		collapseLint({ into: "drawer", toggle: "sometimes" }),
		collapseLint({ into: "drawer", toggle: "always", side: "left" }),
	],
	[
		["1/0/0 foldable is gone: write collapse: { into: drawer, toggle: always }"],
		['1/0/0 into: "popover" is not allowed; write one of stack, drawer, sheet, menu, hide'],
		['1/0/0 toggle: "sometimes" is not allowed; write one of always, adaptive'],
		["1/0/0 collapse holds only into and toggle, not side"],
	],
);
check(
	"while a kind alone and a whole collapse are both clean",
	[collapseLint("sheet"), collapseLint({ into: "drawer", toggle: "always" })],
	[[], []],
);
const PHANTOM =
	"a column inside a column with no surface and no heading draws as nothing, yet it changes every gap inside it: give it a surface or a heading as its first child, or move its children up into the parent";
const HEADED = (widget) => (widget === "@x/title" ? "text" : null);
check(
	"a box of its parent's direction with no surface and no heading is a phantom; a heading, a surface or a turn of direction makes it real",
	[
		lintSaid(boardWith([{ dir: "column", of: [{ id: "a" }, { id: "b" }] }])),
		lintSaid(
			{
				tiles: [
					{ id: "a", widget: "@x/title" },
					{ id: "b", widget: "@x/stat" },
				],
				layout: rootWith([{ dir: "column", of: [{ id: "a" }, { id: "b" }] }]),
			},
			HEADED,
		),
		lintSaid(boardWith([{ dir: "column", surface: "apart", of: [{ id: "a" }, { id: "b" }] }])),
		lintSaid(boardWith([{ dir: "row", of: [{ id: "a" }, { id: "b" }] }])),
	],
	[[`1/0 ${PHANTOM}`], [], [], []],
);
check(
	"a leaf standing as a region is named",
	lintSaid({ tiles: [{ id: "a", widget: "@x/stat" }], layout: { dir: "row", of: [{ id: "a" }] } }),
	["0 a region is a box: wrap this leaf in { dir: column, of: [...] }"],
);
check("a leaf naming no tile is named", lintSaid(boardWith([{ id: "ghost" }])), [
	'1/0 no tile in tiles has the id "ghost"',
]);
check(
	"a list is a group around rows that repeat, and its rows may all wear their white plates",
	lintSaid(
		boardWith([
			{
				dir: "column",
				surface: "group",
				of: [
					{ id: "a", surface: "group" },
					{ id: "b", surface: "group" },
				],
			},
		]),
	),
	[],
);
const aloneSaid =
	"law R: a group stands alone: a plate is earned by a repeat — the same thing beside it again, or a list of the same things it holds";
check(
	"law R: a plate around one widget, and a plate on a widget nothing repeats, are named",
	[
		lintSaid(boardWith([{ dir: "column", surface: "group", of: [{ id: "a" }] }, { id: "b" }])),
		lintSaid({
			tiles: [
				{ id: "a", widget: "@x/stat" },
				{ id: "b", widget: "@x/heat" },
			],
			layout: rootWith([{ id: "a", surface: "group" }, { id: "b" }]),
		}),
	],
	[[`1/0 ${aloneSaid}`], [`1/0 ${aloneSaid}`]],
);

console.log("\n— the gap a person sees, and the corner each plate gets —\n");

const plate = { id: "p", surface: "group" };
const bare = { id: "q" };
const WIDGETS = { p: "@x/stat", q: "@x/heat", r: "@x/stat", s: "@x/stat", h: "@x/title" };
const INSETS = { padded: { top: 12, right: 20, bottom: 6, left: 0 } };
const asked = (id) => ({
	widget: WIDGETS[id],
	role: WIDGETS[id] === "@x/title" ? "text" : "indicator",
	insets: INSETS[id],
});
const gapAt = (level, one, other, dir = "column") =>
	pairGapOf({ dir, of: [one, other] }, 0, { level, ask: asked }, dir);
check(
	"a gap is the step of its box's level: 24 in a region, 16 one box down, 8 below that and never smaller",
	[gapAt(0, bare, { id: "x" }), gapAt(1, bare, { id: "x" }), gapAt(2, bare, { id: "x" }), gapAt(5, bare, { id: "x" })],
	STEP_PX.concat(STEP_PX[2]),
);
check(
	"a box of one widget over and over, and the gap under a heading, are spaced one step closer",
	[gapAt(0, { id: "r" }, { id: "s" }), gapAt(0, { id: "h" }, bare), gapAt(0, bare, { id: "h" })],
	[STEP_PX[1], STEP_PX[1], STEP_PX[0]],
);
check(
	"a widget's own empty edge is taken off the gap on the side that faces it, never under the floor; a plate's edge is seen, so its padding is not",
	[
		gapAt(0, plate, bare),
		gapAt(0, { dir: "row", of: [plate, plate] }, bare),
		gapAt(0, bare, { id: "padded" }),
		gapAt(0, { id: "padded" }, bare),
		gapAt(0, { id: "padded" }, bare, "row"),
		gapAt(0, bare, { id: "padded" }, "row"),
	],
	[STEP_PX[0], STEP_PX[0], STEP_PX[0] - 12, STEP_PX[0] - 6, MIN_GAP_PX, STEP_PX[0]],
);
const otherPlate = { id: "r", surface: "group" };
check(
	"between two plates the padding is taken off once, so cards stand one small step apart at every level; a row counts as a plate only when all of it is",
	[
		gapAt(0, plate, otherPlate),
		gapAt(1, plate, otherPlate),
		gapAt(0, { dir: "row", of: [plate, otherPlate] }, plate),
		gapAt(0, { dir: "row", of: [plate, bare] }, plate),
	],
	[
		Math.max(STEP_PX[0] - SURFACE_PAD_PX, MIN_GAP_PX),
		MIN_GAP_PX,
		Math.max(STEP_PX[0] - SURFACE_PAD_PX, MIN_GAP_PX),
		STEP_PX[0],
	],
);
check(
	"a box faces its neighbour with what stands at that end of it",
	gapAt(0, { dir: "column", of: [bare, { id: "padded" }] }, { dir: "row", of: [{ id: "padded" }, bare] }),
	STEP_PX[0] - 6 - 0,
);
const kept = laidRegion(
	{ dir: "row", of: [{ dir: "column", keep: true, of: [{ dir: "row", of: [plate, bare] }, bare] }] },
	0,
	616,
	{ ask: asked },
).node;
check(
	"a region spaces its own children at the first step and a box inside it at the second",
	[kept.gap, kept.of[0].gap],
	[STEP_PX[0], STEP_PX[1]],
);
check(
	"the row shares out what is left after its gap",
	kept.of[0].of.map((child) => Math.round(child.width)),
	[(600 - STEP_PX[1]) / 2, (600 - STEP_PX[1]) / 2],
);
check(
	"a view of a swap spaces at the swap's own level",
	levelAt({ dir: "row", of: [{ dir: "column", of: [{ dir: "swap", of: [{ dir: "column", of: [] }] }] }] }, [0, 0, 0]),
	1,
);
check("a plate at the top gets the kanban column's corner, and hands the kit a smaller one", plateOf(1), {
	corner: PLATE_CORNER_PX,
	kitPlate: 6,
	kitItem: MIN_CORNER_PX,
});
const nestedPlates = laid(
	{ dir: "column", surface: "group", of: [{ dir: "column", surface: "group", of: [bare, { id: "r" }] }, { id: "s" }] },
	600,
	{
		ask: () => ({}),
		path: [1],
		edges: allEdges(8),
	},
);
check("a plate inside a plate is one padding rounder-in", [nestedPlates.corner, nestedPlates.of[0].corner], [14, 6]);
check(
	"the padding the stylesheet paints is the padding the layout subtracts",
	Number(/--wg-group-pad:\s*(\d+)px/.exec(readFileSync("styles.css", "utf8"))?.[1]),
	SURFACE_PAD_PX,
);

const BOARD_WIDGETS = readdirSync("widgets")
	.filter((scope) => scope.startsWith("@"))
	.flatMap((scope) =>
		readdirSync(path.join("widgets", scope)).map((name) => path.join("widgets", scope, name, "manifest.json")),
	)
	.filter((file) => existsSync(file))
	.map((file) => ({ file, manifest: JSON.parse(readFileSync(file, "utf8")) }))
	.filter(({ manifest }) => manifest.inline !== true);
check(
	"every widget a board can hold names its role from the closed list",
	BOARD_WIDGETS.filter(({ manifest }) => !isKnownRole(manifest.role)).map(({ file }) => file),
	[],
);

check(
	"a note's measurement lives under the plugin, named by its path",
	measuredPathOf("Boards/Home.md"),
	".widgetarium/agent/measured/Boards__Home.md.json",
);
check("lightness reads a colour the browser resolved", Math.round(lightnessOf(colorOf("color(srgb 1 1 1)"))), 100);
check("contrast is WCAG's", Math.round(contrastOf(colorOf("rgb(0, 0, 0)"), colorOf("rgb(255, 255, 255)"))), 21);

console.log("\n— painted in Chrome —\n");

const script = await bundleOf("tools/surface-page.jsx");

const page = `<!doctype html><html><head><meta charset="utf-8">
<style>${readFileSync("styles.css", "utf8")}</style>
<style>body { margin: 0; background: #fff; color: #222; --background-primary: #fff; --background-secondary: #f6f6f6;
	--background-modifier-border: #e4e4e4; --text-normal: #222; --text-muted: #707070; --text-faint: #ababab;
	--text-on-accent: #fff; --interactive-accent: #6d4ee0; }
.wg-host, .wg-host * { transition: none !important; animation: none !important; }</style>
</head><body><div class="wg-host"></div>
<script id="wg-measure" type="application/json"></script>
<script>${script}</script>
</body></html>`;

const work = mkdtempSync(path.join(tmpdir(), "wg-surface-"));
const file = path.join(work, "surface.html");
writeFileSync(file, page);
const dom = execFileSync(
	findBrowser("surface"),
	[
		"--headless",
		"--disable-gpu",
		"--no-sandbox",
		"--hide-scrollbars",
		"--window-size=1600,1200",
		"--virtual-time-budget=6000",
		"--dump-dom",
		`file://${file}`,
	],
	{
		encoding: "utf8",
		maxBuffer: 64 * 1024 * 1024,
		stdio: ["ignore", "pipe", process.env.WG_DEBUG ? "inherit" : "ignore"],
	},
);
const payload = /<script id="wg-measure" type="application\/json">([\s\S]*?)<\/script>/.exec(dom)?.[1];
if (!payload) {
	console.error(`surface gate: the page never reported — file://${file}`);
	process.exit(1);
}
const read = JSON.parse(payload.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"));
if (read.thrown) {
	console.error(`surface gate: the page threw — ${read.thrown}`);
	process.exit(1);
}
if (process.env.WG_DEBUG) console.log(JSON.stringify(read, null, 1));
const { paint, measure } = read;

check("fill paints the group token", [paint.fill.surface, paint.fill.background], ["group", paint.fill.token]);
check(
	"a top plate is padded by 16px and rounded like a kanban column",
	[paint.fill.padding, paint.fill.corner],
	["16px", "14px"],
);
check(
	"the cells stand inside that padding",
	near(paint.fill.cells[0].left - paint.fill.box.left, 16) &&
		near(paint.fill.box.right - paint.fill.cells[0].right, 16),
	true,
);
check(
	"two repeats of one widget inside a plate stand one step closer, less the empty edge the upper one leaves",
	Math.round(paint.lower.gap),
	Math.max(STEP_PX[2] - (paint.rowGap.before?.bottom ?? 0), MIN_GAP_PX),
);
check(
	"a plate inside a plate is rounded one padding smaller, and the kit inside inherits it",
	[paint.lower.nestedCorner, paint.lower.kitPlate],
	["6px", "6px"],
);
const probeInsets = [paint.rowGap.before ?? {}, paint.rowGap.after ?? {}];
const rowFacing = (side) => Math.min(...probeInsets.map((insets) => insets[side] ?? 0));
check(
	"a plate's own edge is what the eye measures from: the region's 24 is drawn in full beside it, less only the bare row's empty edge",
	[Math.round(paint.gaps.plateToBare), Math.round(paint.gaps.bareToPlate)],
	[Math.max(STEP_PX[0] - rowFacing("top"), MIN_GAP_PX), Math.max(STEP_PX[0] - rowFacing("bottom"), MIN_GAP_PX)],
);

check(
	"a widget inherits its gaps from the cell it stands in: one step under a sidebar, the floor inside a nested row",
	[paint.cellGaps.sidebar, paint.cellGaps.nested],
	[`${STEP_PX[1]}px`, `${STEP_PX[2]}px`],
);
const slots = paint.slots;
check(
	"a slot the tile dresses as a card is wrapped by the engine in that plate, padded like any plate",
	[slots.cards.surface, slots.cards.background, slots.cards.padding],
	["group", slots.inset, `${SURFACE_PAD_PX}px`],
);
check(
	"SlotList spaces cards at the cards gap and bare items at the items gap, both read from the root's variables",
	[Math.round(slots.cards.gap), Math.round(slots.bare.gap), slots.bare.surface],
	[parseFloat(slots.steps["--wg-gap-cards"]), parseFloat(slots.steps["--wg-gap-items"]), null],
);

const padded = paint.padded;
check(
	"a widget's empty edge is read to its nearest text, picture or paint, and hidden text is not content",
	padded.insets,
	{ top: 20, right: 60, bottom: 200 - (padded.wordsBottom + 10), left: 30 },
);
const rowGap = paint.rowGap;
check(
	"the engine draws a gap short by the empty edges the drawn widgets face it with",
	Math.round(rowGap.drawn),
	Math.max(STEP_PX[1] - (rowGap.before?.right ?? 0) - (rowGap.after?.left ?? 0), MIN_GAP_PX),
);
check(
	"and that probe has an empty edge to take off, so the check can fail",
	(rowGap.before?.right ?? 0) + (rowGap.after?.left ?? 0) > 0,
	true,
);

const column = paint.columnLine;
check(
	"a line inside a fill runs from its left edge to its right edge",
	column && [near(column.left, paint.fill.box.left), near(column.right, paint.fill.box.right)],
	[true, true],
);
check(
	"and sits in the middle of the gap it divides",
	column && near((column.top + column.bottom) / 2, (paint.fill.cells[0].bottom + paint.fill.cells[1].top) / 2),
	true,
);
check("and is one pixel", column && near(column.bottom - column.top, 1, 0.1), true);

const row = paint.rowLine;
check(
	"a line beside a cell stands in the middle of the gap to its neighbour",
	row.line && near((row.line.left + row.line.right) / 2, (row.cell.right + row.next.left) / 2),
	true,
);

const region = paint.regionLine;
check(
	"a sidebar's line stands between it and the kept column",
	region.line && region.line.left > region.left.right && region.line.right < region.main.left,
	true,
);
check(
	"and runs the whole height of the region",
	region.line && [near(region.line.top, region.left.top), near(region.line.bottom, region.left.bottom)],
	[true, true],
);
check("an empty sidebar and the kept column wear nothing", [paint.emptyRegion, paint.mainRegion], [null, null]);

const paged = paint.pageLine;
check(
	"on a page, a sidebar's line starts at the pane's top edge, under the header",
	paged?.line && paged.line.top <= paged.pane.top,
	true,
);
check(
	"and ends at the pane's bottom edge however short the board is",
	paged?.line && near(paged.line.bottom, paged.pane.bottom),
	true,
);
check("and makes the page no taller than the pane", paged?.scrolls, false);

console.log("\n— the measurement reads roles, not colours —\n");

check("a column holding a title and a line is a container inside the root container", measure.depth, 2);
check(
	"what touches the group is the root container, never the button, the tag or anything inside",
	measure.fills.map((one) => one.kind),
	["container"],
);
check("text lying on the widget's own fill is not text on the group", measure.texts, []);
check("nothing threw while it drew", read.failures, []);

console.log("\n— the writer refuses, so no caller may read the laws, decide, and write anyway —\n");
{
	const grouped = normalizeBoard({
		tiles: [
			{ id: "a", widget: "@x/a" },
			{ id: "b", widget: "@x/a" },
		],
		layout: {
			dir: "row",
			of: [
				{
					dir: "column",
					keep: true,
					of: [
						{
							dir: "column",
							surface: "group",
							role: "indicators",
							purpose: "How it goes",
							of: [{ id: "a" }, { id: "b" }],
						},
					],
				},
			],
		},
	}).layout;
	const at = [0, 0, 0];
	const widgetOf = () => "@x/a";
	const leafOf = (layout, which) => layout.of[0].of[0].of[which];

	const refused = wornSurfaceAt(grouped, at, "object", undefined, widgetOf);
	check("an object, a surface no longer held, is refused by the writer", refused.refusal?.law, "S");
	check("and the tree it was given comes back untouched", refused.layout, grouped);

	const worn = wornSurfaceAt(grouped, at, "group", undefined, widgetOf);
	check("one the laws leave standing is written", [worn.refusal, leafOf(worn.layout, 0).surface], [null, "group"]);

	const bothPlated = wornSurfaceAt(worn.layout, [0, 0, 1], "group", undefined, widgetOf);
	check("plating the last bare row of a list is written too: grey around, white rows", bothPlated.refusal, null);
	const lone = wornSurfaceAt(grouped, at, "group", undefined, (id) => `@x/${id}`);
	check("and a row repeating nothing beside it is refused by the writer", lone.refusal?.law, "R");

	const divider = wornSurfaceAt(grouped, at, "apart", "start");
	check(
		"a divider keeps the side it was given",
		[leafOf(divider.layout, 0).surface, leafOf(divider.layout, 0).side],
		["apart", "start"],
	);

	const bare = wornSurfaceAt(divider.layout, at, "none");
	check(
		"taking the surface off takes the side with it",
		[leafOf(bare.layout, 0).surface, leafOf(bare.layout, 0).side],
		[undefined, undefined],
	);

	const gone = wornSurfaceAt(grouped, [0, 0, 7], "group");
	check(
		"a path naming nothing is refused in words, not with a crash",
		[gone.layout === grouped, Boolean(gone.refusal)],
		[true, true],
	);

	const sideways = wornSurfaceAt(grouped, at, "apart", "sideways");
	check(
		"a side outside the two that exist is not written",
		[leafOf(sideways.layout, 0).surface, leafOf(sideways.layout, 0).side],
		["apart", undefined],
	);

	const offered = surfaceChoicesAt(grouped, at, widgetOf);
	check(
		"the picker is offered exactly what the writer would take",
		offered.map((one) => [one.surface, Boolean(one.refusal)]),
		[
			["group", false],
			["apart", false],
			["none", false],
		],
	);
}

console.log(failed === 0 ? "\nsurface gate: clean" : `\nsurface gate: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
