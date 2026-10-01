import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { widgetsCliBundle } from "../apps/obsidian/build.mts";
import { z } from "../packages/core/src/gateway/declared.ts";
import { fieldIn } from "./held-fields.ts";
import { present } from "./page-dom.ts";

const run = promisify(execFile);

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

const CARDS = {
	roster: {
		title: "Roster",
		description: "Everyone on the team and when they joined.",
		keywords: ["people", "team"],
		role: "collection",
		props: { people: { kind: "collection", describes: { name: { type: "text" }, joined: { type: "date" } } } },
	},
	ledger: {
		title: "Ledger",
		description: "What was spent, lined up by date and amount.",
		keywords: ["money", "ledger", "spend"],
		role: "collection",
		props: {
			rows: {
				kind: "collection",
				tracks: true,
				describes: { title: { type: "text" }, amount: { type: "number" }, when: { type: "date" } },
			},
		},
	},
	gauge: {
		title: "Gauge",
		description: "One running total.",
		keywords: ["total"],
		role: "indicator",
		props: { total: { kind: "value", type: "number" } },
	},
	blank: { title: "Blank", description: "Nothing at all.", keywords: [], role: "text", props: {} },
};

const vault = await mkdtemp(join(tmpdir(), "wg-find-"));
const bin = join(vault, ".widgetarium", "bin");
await mkdir(bin, { recursive: true });
await writeFile(join(bin, "widgets.mjs"), await widgetsCliBundle());
for (const [name, card] of Object.entries(CARDS)) {
	const folder = join(vault, ".widgetarium", "widgets", "@test", name);
	await mkdir(folder, { recursive: true });
	await writeFile(join(folder, "widget.tsx"), "export default null;\n");
	await writeFile(join(folder, "manifest.generated.json"), JSON.stringify(card));
}

const RankedRowSchema = z.looseObject({
	id: z.string(),
	score: z.number(),
	why: z.array(z.string()),
	reads: z.unknown(),
	wraps: z.unknown(),
	pack: z.unknown(),
});
const FoundSchema = z.object({ total: z.number(), widgets: z.array(RankedRowSchema) });
type RankedRow = z.infer<typeof RankedRowSchema>;
const CheckedSchema = z.looseObject({
	clean: z.unknown(),
	findings: z.array(z.object({ rule: z.string() })).optional(),
});

interface Exit {
	readonly code: unknown;
	readonly said: string;
}

function exitOf(thrown: unknown): Exit {
	return { code: fieldIn(thrown, "code"), said: String(fieldIn(thrown, "stderr")) };
}

function rowAt(rows: readonly RankedRow[], at: number): RankedRow {
	return present(rows[at], `ranked row ${at}`);
}

const refusal = async (...args: string[]): Promise<Exit> => {
	try {
		await run("node", [join(bin, "widgets.mjs"), "find", ...args], { maxBuffer: 1 << 22 });
		return { code: 0, said: "" };
	} catch (thrown) {
		return exitOf(thrown);
	}
};

const find = async (...args: string[]): Promise<z.infer<typeof FoundSchema>> => {
	const { stdout } = await run("node", [join(bin, "widgets.mjs"), "find", ...args], { maxBuffer: 1 << 22 });
	return FoundSchema.parse(JSON.parse(stdout));
};

const asked = await find("--role", "collection", "--reading", "table", "--needs", "number,date", "--about", "money");
const order = asked.widgets.map((row) => row.id);

check("every widget comes back, never a filtered set", asked.total, 4);
check("the widget answering role, reading, needs and subject ranks first", order[0], "@test/ledger");
check("the ranking is the whole catalogue in order", order, [
	"@test/ledger",
	"@test/roster",
	"@test/gauge",
	"@test/blank",
]);
check("a widget that answers nothing still comes back", order.includes("@test/blank"), true);
check("the last row scores nothing", rowAt(asked.widgets, 3).score, 0);
check("a matched type is named in the reasons", rowAt(asked.widgets, 0).why.includes("holds number"), true);
check("a missing type is named in the reasons", rowAt(asked.widgets, 2).why.includes("no field for date"), true);
check(
	"a text field is offered as a carrier",
	rowAt(asked.widgets, 1).why.includes("no number, but a text field can carry it"),
	true,
);
check("the reading is reported when it misses", rowAt(asked.widgets, 1).why.includes("reads as comparison"), true);

const byNeedsAlone = await find("--needs", "number");
const needsOrder = byNeedsAlone.widgets.map((row) => row.id);
check("needs alone still ranks", needsOrder.slice(0, 2).sort(), ["@test/gauge", "@test/ledger"]);
check("a carrier ranks under an exact match and over nothing", needsOrder.slice(2), ["@test/roster", "@test/blank"]);

const refused = await refusal("--reading", "nonsense");
check("a reading that is not one of the five leaves a non-zero exit", refused.code, 1);
check("the refusal is said on the error stream", refused.said.includes("nonsense is not a reading"), true);
check("the refusal names the five", refused.said.includes("sequence | comparison | table | cross | field"), true);

const reads = present(
	asked.widgets.find((row) => row.id === "@test/ledger"),
	"the ledger row",
);
check("a row says how its props read", reads.reads, ["table"]);
check("a row says how that reading wraps", reads.wraps, ["around"]);

const narrowedByWord = await find("--search", "ledger");
check("search narrows to what it matches", narrowedByWord.total, 1);
const rankedByWord = await find("--about", "ledger");
check("about never narrows, it only lifts", rankedByWord.total, 4);
check("and what it names comes first", rowAt(rankedByWord.widgets, 0).id, "@test/ledger");
const byPack = await find("--pack", "@test");
check("pack narrows to a pack", byPack.total, 4);
check("a row still carries what installing it needs", typeof rowAt(rankedByWord.widgets, 0).pack, "string");

const askedNothing = await find();
check("asking nothing ranks nothing and still returns everything", askedNothing.total, 4);
check("asking nothing scores everything zero", [...new Set(askedNothing.widgets.map((row) => row.score))], [0]);

const checked = async (id: string): Promise<z.infer<typeof CheckedSchema> & { readonly code: unknown }> => {
	try {
		const { stdout } = await run("node", [join(bin, "widgets.mjs"), "check", id], { maxBuffer: 1 << 22 });
		return { code: 0, ...CheckedSchema.parse(JSON.parse(stdout)) };
	} catch (thrown) {
		return { code: fieldIn(thrown, "code"), ...CheckedSchema.parse(JSON.parse(String(fieldIn(thrown, "stdout")))) };
	}
};

const okWidget = join(vault, ".widgetarium", "widgets", "@test", "roster");
await writeFile(
	join(okWidget, "widget.tsx"),
	"const l = useData(people.list, { limit: 20 });\nl.data.map((r) => r);\n",
);

const beforeTypes = await run("node", [join(bin, "widgets.mjs"), "check", "@test/roster"]).then(
	() => ({ code: 0, said: "" }),
	(thrown: unknown) => exitOf(thrown),
);
check("a vault with no laid types cannot call any widget clean", beforeTypes.code, 1);
check("and says the rule that catches a crash could not run", beforeTypes.said.includes("crash at draw time"), true);

const types = join(vault, ".widgetarium", "widgets", "types");
await mkdir(types, { recursive: true });
await writeFile(join(types, "widgetarium.d.ts"), 'export { useData } from "./gateway/use-data";\n');
const clean = await checked("@test/roster");
check("a widget that breaks no rule exits zero", clean.code, 0);
check("and is reported clean", clean.clean, true);

const badWidget = join(vault, ".widgetarium", "widgets", "@test", "ledger");
await writeFile(
	join(badWidget, "widget.tsx"),
	"const c = '#ff8800';\nconst l = useData(rows.list);\nl.data.map((r) => r);\n",
);
await writeFile(join(badWidget, "widget.css"), "a { font-family: Inter; }\n");
const dirty = await checked("@test/ledger");
check("a widget that breaks rules exits one", dirty.code, 1);
check("and names every rule it broke", (dirty.findings ?? []).map((one) => one.rule).sort(), [
	"colour",
	"font",
	"unbounded",
]);
check("a widget that does not exist is refused", (await checked("@test/nothing").catch(() => ({ code: 1 }))).code, 1);

await rm(vault, { recursive: true, force: true });

console.log(`\n${checks - failed}/${checks} checks passed`);
process.exit(failed === 0 ? 0 : 1);
