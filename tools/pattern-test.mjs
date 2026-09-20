import { buildMirror } from "./mirror.mjs";

buildMirror();

const { PATTERNS, PATTERN_NAMES, CARDS, CARD_NAMES, cardNode, skeletonOf, patternMismatch, emptyColumnsOf } =
	await import("./.mjs-cache/patterns.mjs");
const { nestingFindings } = await import("./.mjs-cache/surface-laws.mjs");
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
const { lintBoard } = await import("./.mjs-cache/board-lint.mjs");
const { normalizeBoard, serializeBoard } = await import("./.mjs-cache/model.mjs");

let failed = 0;
let checks = 0;
const check = (name, got, want) => {
	checks += 1;
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`,
	);
};

const { ROLES } = await import("./.mjs-cache/surface-roles.mjs");

for (const name of PATTERN_NAMES) {
	const columns = PATTERNS[name].layout.of;
	check(`${name} is a plain tree of boxes, nothing else`, PATTERNS[name].layout.dir, "row");
	check(
		`${name} names a role the surface laws know on every column`,
		columns.every((one) => ROLES.includes(one.role)),
		true,
	);
	check(`${name} keeps exactly one column`, columns.filter((one) => one.keep).length, 1);
	check(
		`${name} gives every column a purpose`,
		columns.every((one) => typeof one.purpose === "string" && one.purpose !== ""),
		true,
	);
	check(
		`${name} writes only keys a box may carry`,
		columns.every((one) => Object.keys(one).every((key) => BOX_KEYS.includes(key))),
		true,
	);
}

const asBoard = (raw) => serializeBoard(normalizeBoard(raw));
const skeleton = skeletonOf("list-detail", asBoard);
check("the skeleton carries the pattern's name", skeleton.pattern, "list-detail");
check("and cuts the page into its columns", skeleton.layout.of.length, 2);
check("the side column wears the pattern's surface", skeleton.layout.of[0].surface, "apart");
check(
	"and collapses, because a pane that cannot hold its place is a drawer",
	skeleton.layout.of[0].collapse.into,
	"drawer",
);
check("the kept column wears none and says so by holding no surface", "surface" in skeleton.layout.of[1], false);
check(
	"every column is born empty, so the agent fills it",
	skeleton.layout.of.every((one) => one.of.length === 0),
	true,
);
check("a name nobody serves has no skeleton", skeletonOf("nonsense", asBoard), null);
check("the skeleton is a board block, stamped with the format an older plugin refuses", skeleton.v, 2);
check("and carries a tiles list, empty, so it parses as a board", skeleton.tiles, []);

const asked = { v: 2, tiles: [], pattern: "list-detail", layout: skeleton.layout };
check("a board keeps the pattern it was cut from", normalizeBoard(asked).pattern, "list-detail");
check("and writes it back", serializeBoard(normalizeBoard(asked)).pattern, "list-detail");
check(
	"a pattern nobody serves is kept rather than eaten out of the person's note",
	normalizeBoard({ ...asked, pattern: "list-detil" }).pattern,
	"list-detil",
);
check(
	"and lint is what names it",
	lintBoard({ ...asked, pattern: "list-detil" }).some((one) => one.message.includes("is not a pattern")),
	true,
);

check("a skeleton matches the pattern it came from", patternMismatch("list-detail", skeleton.layout), null);
const threeRegions = { dir: "row", of: [...skeleton.layout.of, { dir: "column", role: "detail", of: [] }] };
check(
	"a third column contradicts a two-column pattern",
	patternMismatch("list-detail", threeRegions)?.includes("2 columns"),
	true,
);
const wrongRole = { dir: "row", of: [{ dir: "column", role: "media", of: [] }, skeleton.layout.of[1]] };
check(
	"a column holding the wrong role is named",
	patternMismatch("list-detail", wrongRole)?.includes("should hold collection"),
	true,
);
check("every column is empty in a fresh skeleton", emptyColumnsOf(skeleton.layout), [0, 1]);

const linted = lintBoard(asked);
check("a fresh skeleton lints clean, because an empty box is a real box", linted, []);
const filled = {
	...asked,
	tiles: [
		{ id: "a", widget: "@x/list" },
		{ id: "b", widget: "@x/one" },
	],
	layout: {
		dir: "row",
		of: [
			{ ...skeleton.layout.of[0], of: [{ id: "a" }] },
			{ ...skeleton.layout.of[1], of: [{ id: "b" }] },
		],
	},
};
check("a filled board of the same pattern lints clean", lintBoard(filled), []);
const halfFilled = {
	...filled,
	layout: { dir: "row", of: [{ ...skeleton.layout.of[0], of: [{ id: "a" }] }, skeleton.layout.of[1]] },
};
check("a column still empty while the one beside it holds widgets is named", halfFilled.layout.of.length, 2);
check(
	"and lint says so",
	lintBoard(halfFilled).some((one) => one.message.includes("still empty")),
	true,
);

const miscut = { ...filled, pattern: "three-pane" };
check(
	"calling it another pattern is caught by the geometry",
	lintBoard(miscut).some((one) => one.message.includes("three-pane")),
	true,
);

for (const name of CARD_NAMES) {
	const card = CARDS[name];
	check(`${name} names a role the surface laws know`, ROLES.includes(card.role), true);
	check(
		`${name} gives every part a role to ask for`,
		card.parts.every((one) => ROLES.includes(one.asks)),
		true,
	);
	check(
		`${name} carries no plate on any part, because only the card wears one`,
		card.parts.every((one) => !("surface" in one)),
		true,
	);
	const amongPeers = cardNode(name, { amongPeers: true });
	const onTheirGroup = {
		dir: "row",
		of: [
			{
				dir: "column",
				role: "collection",
				of: [structuredClone(amongPeers), structuredClone(amongPeers)],
			},
		],
	};
	check(`${name} among peers breaks no nesting law`, nestingFindings(onTheirGroup), []);
	const alone = cardNode(name);
	const standingAlone = { dir: "row", of: [{ dir: "column", role: "detail", of: [alone] }] };
	check(`${name} standing alone breaks no nesting law`, nestingFindings(standingAlone), []);
}

check("a card nobody serves has no node", cardNode("nonsense"), null);
check(
	"a list row never wears a plate, whichever way it stands",
	[cardNode("list-row")?.surface, cardNode("list-row", { amongPeers: true })?.surface],
	[undefined, undefined],
);
check(
	"a lone metric takes no plate, and among peers it does",
	[cardNode("metric")?.surface, cardNode("metric", { amongPeers: true })?.surface],
	[undefined, "group"],
);

console.log(`${checks - failed}/${checks} checks passed`);
process.exit(failed === 0 ? 0 : 1);
