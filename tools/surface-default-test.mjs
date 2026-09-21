import { buildMirror } from "./mirror.mjs";

buildMirror();

const { withDefaultSurfaces, surfacesWritten } = await import("./.mjs-cache/surface-default.mjs");
const { normalizeBoard, serializeBoard } = await import("./.mjs-cache/model.mjs");
const { nestingFindings, widgetOfTiles } = await import("./.mjs-cache/surface-laws.mjs");

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

const ROLE_OF = {
	"@x/list": "collection",
	"@x/stat": "indicator",
	"@x/words": "text",
	"@x/one": "detail",
	"@x/nav": "navigation",
};
const roleOf = (widget) => ROLE_OF[widget] ?? null;
const tiles = [
	{ id: "a", widget: "@x/list" },
	{ id: "b", widget: "@x/words" },
	{ id: "c", widget: "@x/stat" },
	{ id: "d", widget: "@x/stat" },
];

const bare = () => ({
	dir: "row",
	of: [
		{
			dir: "column",
			role: "collection",
			purpose: "Every one of them",
			collapse: { into: "drawer", toggle: "adaptive" },
			of: [{ id: "a" }],
		},
		{
			dir: "column",
			role: "detail",
			purpose: "The one that is open",
			keep: true,
			of: [
				{ id: "b" },
				{ dir: "column", role: "indicators", purpose: "How it is going", of: [{ id: "c" }, { id: "d" }] },
			],
		},
	],
});

check("an agent writes a structure carrying no surface at all", surfacesWritten(bare()), {});

const laid = withDefaultSurfaces({ layout: bare(), tiles, roleOf });
check("the algorithm lays them from the tree alone, with nothing drawn yet", surfacesWritten(laid), {
	0: "apart",
	"1/1": "group",
});
check("the card gets its plate without anybody asking", laid.of[1].of[1].surface, "group");
check("and what it laid breaks no nesting law", nestingFindings(laid, widgetOfTiles(tiles)), []);

const twice = withDefaultSurfaces({ layout: laid, tiles, roleOf });
check("laying it a second time changes nothing", surfacesWritten(twice), surfacesWritten(laid));

const byHand = structuredClone(laid);
byHand.of[1].of[1].surface = "object";
check(
	"a surface a person set by hand is never overwritten",
	withDefaultSurfaces({ layout: byHand, tiles, roleOf }).of[1].of[1].surface,
	"object",
);

const single = {
	dir: "row",
	of: [{ dir: "column", role: "detail", purpose: "The one thing", keep: true, of: [{ id: "b" }] }],
};
check(
	"a box holding one widget takes no plate, because the box already sets it apart",
	surfacesWritten(withDefaultSurfaces({ layout: single, tiles, roleOf })),
	{},
);

const text = {
	dir: "row",
	of: [{ dir: "column", role: "text", purpose: "Words", keep: true, of: [{ id: "b" }, { id: "c" }] }],
};
check("a text box never takes a plate", surfacesWritten(withDefaultSurfaces({ layout: text, tiles, roleOf })), {});

const board = { v: 2, tiles, layout: bare() };
check("a board read without roles is left exactly as written", surfacesWritten(normalizeBoard(board).layout), {});
const read = normalizeBoard(board, undefined, undefined, roleOf);
check("a board read with them comes back surfaced", surfacesWritten(read.layout), { 0: "apart", "1/1": "group" });
check("and writing it back keeps what was laid", surfacesWritten(serializeBoard(read).layout), {
	0: "apart",
	"1/1": "group",
});

console.log(`${checks - failed}/${checks} checks passed`);
process.exit(failed === 0 ? 0 : 1);
