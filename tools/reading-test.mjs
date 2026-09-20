import { buildMirror } from "./mirror.mjs";

buildMirror();

const {
	readingOf,
	wrapOf,
	readingOfProp,
	READINGS,
	SEQUENCE,
	COMPARISON,
	TABLE,
	CROSS,
	FIELD,
	WRAP_AROUND,
	WRAP_EACH,
	WRAP_NONE,
} = await import("./.mjs-cache/reading.mjs");

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

const todo = { isCollection: true, fieldsCount: 1, tracks: false, isWord: false };
const stats = { isCollection: true, fieldsCount: 2, tracks: false, isWord: false };
const rows = { isCollection: true, fieldsCount: 4, tracks: true, isWord: false };
const lookup = { isCollection: false, fieldsCount: 1, tracks: true, isWord: true };
const heatmap = { isCollection: false, fieldsCount: 1, tracks: true, isWord: false };

check("a row of one field and a control is a sequence", readingOf(todo), SEQUENCE);
check("a row of two fields is a comparison", readingOf(stats), COMPARISON);
check("fields in shared tracks are a table", readingOf(rows), TABLE);
check("a word at an intersection is a cross", readingOf(lookup), CROSS);
check("a scalar at an intersection is a field", readingOf(heatmap), FIELD);
check(
	"every reading is reachable",
	[...new Set([todo, stats, rows, lookup, heatmap].map(readingOf))].sort(),
	[...READINGS].sort(),
);

check("a sequence wraps around all", wrapOf(SEQUENCE), WRAP_AROUND);
check("a comparison wraps on each", wrapOf(COMPARISON), WRAP_EACH);
check("a table wraps around all", wrapOf(TABLE), WRAP_AROUND);
check("a cross wraps on each cell", wrapOf(CROSS), WRAP_EACH);
check("a field wraps nowhere", wrapOf(FIELD), WRAP_NONE);
check("an unknown reading wraps nowhere", wrapOf("nonsense"), WRAP_NONE);

check("losing the record turns a table into a field", readingOf({ ...rows, isCollection: false }), FIELD);
check("losing the tracks turns a table into a comparison", readingOf({ ...rows, tracks: false }), COMPARISON);
check("losing a field turns a comparison into a sequence", readingOf({ ...stats, fieldsCount: 1 }), SEQUENCE);
check("gaining a field turns a sequence into a comparison", readingOf({ ...todo, fieldsCount: 2 }), COMPARISON);
check("gaining tracks turns a sequence into a table", readingOf({ ...todo, tracks: true }), TABLE);
check("losing the word turns a cross into a field", readingOf({ ...lookup, isWord: false }), FIELD);
check("gaining the word turns a field into a cross", readingOf({ ...heatmap, isWord: true }), CROSS);
check("tracks cannot move a cross", readingOf({ ...lookup, tracks: false }), CROSS);
check("nothing at all is a field", readingOf(), FIELD);

const collection = { kind: "collection", describes: { title: { type: "text" }, done: { type: "boolean" } } };
const checklist = { kind: "collection", describes: { title: { type: "text" } } };
const table = { kind: "collection", tracks: true, describes: { title: { type: "text" }, due: { type: "date" } } };
const number = { kind: "value", type: "number" };

check("a card with two described fields reads as a comparison", readingOfProp(collection), COMPARISON);
check("a card with one described field reads as a sequence", readingOfProp(checklist), SEQUENCE);
check("a card declaring tracks reads as a table", readingOfProp(table), TABLE);
check("a value holding a number reads as a field", readingOfProp(number), FIELD);
check("a card with no props at all reads as a field", readingOfProp(undefined), FIELD);

const { slotSurfaceOf } = await import("./.mjs-cache/surface-roles.mjs");

const comparing = {
	props: { rows: { kind: "collection", describes: { name: { type: "text" }, due: { type: "date" } } } },
};
const listing = { props: { rows: { kind: "collection", describes: { name: { type: "text" } } } } };
const twoLists = { props: { a: comparing.props.rows, b: listing.props.rows } };

check(
	"an undressed slot over items that compare wears a plate of its own",
	slotSurfaceOf(undefined, undefined, comparing),
	"group",
);
check("an undressed slot over a sequence wears nothing", slotSurfaceOf(undefined, undefined, listing), "none");
check("two collections are a guess, so the slot wears nothing", slotSurfaceOf(undefined, undefined, twoLists), "none");
check("no card at all leaves the slot bare", slotSurfaceOf(undefined, undefined, undefined), "none");
check("what the manifest declares still wins", slotSurfaceOf({ surface: "group" }, undefined, comparing), "group");
check(
	"what the tile picks wins over both",
	slotSurfaceOf({ surface: "group" }, { surface: "none" }, comparing),
	"none",
);
check(
	"a frozen card saying raise is read as a group",
	slotSurfaceOf({ surface: "raise" }, undefined, listing),
	"group",
);
check("a tile saying fill is read as a group", slotSurfaceOf(undefined, { surface: "fill" }, listing), "group");

console.log(`\n${checks - failed}/${checks} checks passed`);
process.exit(failed === 0 ? 0 : 1);
