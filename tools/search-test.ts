import fs from "node:fs";
import { isObject } from "../packages/core/src/engine/is-object.js";

const { fold, rankSearch, DEFAULT_FIELDS } = await import("../packages/core/src/engine/search.js");

let failed = 0;
function check(name: string, got: unknown, want: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`,
	);
}

interface ShippedWidget {
	readonly id: string;
	readonly title: unknown;
	readonly keywords: unknown;
	readonly description: unknown;
}

const fieldOf = (value: unknown, key: string): unknown => (isObject(value) ? value[key] : undefined);
const keywordCountOf = (keywords: unknown): number =>
	Array.isArray(keywords) || typeof keywords === "string" ? keywords.length : 0;

function shippedWidgets(): ShippedWidget[] {
	const found: ShippedWidget[] = [];
	for (const scope of fs.readdirSync("registry")) {
		const folder = `registry/${scope}`;
		if (!fs.statSync(folder).isDirectory()) continue;
		for (const name of fs.readdirSync(folder)) {
			const file = `${folder}/${name}/manifest.generated.json`;
			if (!fs.existsSync(file)) continue;
			const manifest: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
			found.push({
				id: `${scope}/${name}`,
				title: fieldOf(manifest, "title"),
				keywords: fieldOf(manifest, "keywords"),
				description: fieldOf(manifest, "description"),
			});
		}
	}
	return found;
}

const SHIPPED = shippedWidgets();
const firstFor = (query: string): string | null => rankSearch(query, SHIPPED)[0]?.record.id ?? null;
const reaches = (query: string, id: string): boolean => rankSearch(query, SHIPPED).some((hit) => hit.record.id === id);

check(
	"every shipped widget carries a description",
	SHIPPED.filter((one) => !one.description).map((one) => one.id),
	[],
);
check(
	"every shipped widget carries keywords",
	SHIPPED.filter((one) => !(keywordCountOf(one.keywords) > 0)).map((one) => one.id),
	[],
);
check(
	"the fields are searched in one declared order",
	DEFAULT_FIELDS.map((field) => field.key),
	["title", "id", "keywords", "description"],
);

check("an id folds into the words it is made of", fold("@Task/Task-Card"), "task task card");
check("case folds", fold("KANBAN Board"), "kanban board");
check("accents fold", fold("Café Ünicode!"), "cafe unicode");
check("nothing but punctuation folds to nothing", fold("  --/-- "), "");
check("two words find the widget whose id spells them", firstFor("task card"), "@default/task-card");
check("and shouting it with a slash finds the same one", firstFor("  TASK/CARD  "), "@default/task-card");

check("the kanban board is what 'kanban' means", firstFor("kanban"), "@default/kanban-board");
check("a keyword nobody wrote into a title still finds its widget", firstFor("swimlane"), "@default/kanban-board");
check("a word in no manifest at all finds nothing", rankSearch("zzqq", SHIPPED).length, 0);

const PLANTED = [
	{ id: "in-title", title: "Reminder", keywords: [], description: "Nothing here about clocks." },
	{ id: "in-keywords", title: "Note", keywords: ["reminder"], description: "Nothing here about clocks." },
	{ id: "in-description", title: "Chip", keywords: [], description: "A reminder pinned in the text." },
];
check(
	"a title match outranks a keyword match outranks a description match",
	rankSearch("reminder", PLANTED).map((hit) => hit.record.id),
	["in-title", "in-keywords", "in-description"],
);
check("and the description one is still found, not dropped", rankSearch("reminder", PLANTED).length, 3);

const SAME_FIELD = [
	{ id: "scattered", title: "Kind and neat, bare and nice" },
	{ id: "late", title: "The archived kanban" },
	{ id: "start", title: "Kanban board" },
	{ id: "whole", title: "Kanban" },
];
check(
	"a whole field beats a leading run beats a late run beats a scattered subsequence",
	rankSearch("kanban", SAME_FIELD).map((hit) => hit.record.id),
	["whole", "start", "late", "scattered"],
);

check("a dropped letter finds the board", firstFor("knbn"), "@default/kanban-board");
check("a wrong letter finds the board", firstFor("kanbam"), "@default/kanban-board");
check("a transposed pair finds the board", firstFor("kabnan"), "@default/kanban-board");
check("a wrong letter finds the reminder", firstFor("reminber"), "@default/reminder");
check("two stray letters do not reach the board at all", reaches("kanbanxy", "@default/kanban-board"), false);

const ROWS = [
	{ id: "z", title: "Zebra" },
	{ id: "a", title: "Apple" },
];
check(
	"an empty query hands the list back in the order it came",
	rankSearch("", ROWS).map((hit) => hit.record.id),
	["z", "a"],
);
check(
	"whitespace alone is the same",
	rankSearch("   ", ROWS).map((hit) => hit.record.id),
	["z", "a"],
);
check(
	"with every score zero, so a caller sorting by it moves nothing",
	rankSearch("", ROWS).map((hit) => hit.score),
	[0, 0],
);
check("and it drops nobody", rankSearch("", SHIPPED).length, SHIPPED.length);

console.log(
	failed === 0
		? `\nsearch: ${SHIPPED.length} shipped widgets, every check green`
		: `\nsearch: ${failed} check(s) failed`,
);
process.exit(failed === 0 ? 0 : 1);
