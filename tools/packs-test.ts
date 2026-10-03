import type { ImplementationPorts, NetworkAsk, VaultNote } from "../packages/core/src/engine/packs.ts";
import { definePack, registeredCommands, registeredQueries } from "../packages/core/src/engine/packs.ts";
import { NO_CATALOGUE_PORT } from "../packages/core/src/engine/catalogue-port.ts";
import { sourcesFor } from "../packages/core/src/engine/host-gateways.ts";
import { arrayGateway } from "../packages/core/src/gateway/create.ts";
import type { VaultSlot } from "../packages/core/src/gateway/obsidian.ts";
import { FetchRowsQuery, FetchSendCommand, FetchValueQuery } from "../packages/packs/core/src/index.ts";
import {
	FileSetCommand,
	FolderCreateCommand,
	FolderRemoveCommand,
	FolderUpdateCommand,
	OpenCommand,
	SearchQuery,
	TagQuery,
} from "../packages/packs/obsidian/src/index.ts";
import { BreakdownQuery, NumberQuery, SeriesQuery, StreakQuery } from "../packages/packs/stats/src/index.ts";
import { PushCommand } from "../packages/packs/git/src/commands.ts";

let failed = 0;
function check(what: string, got: unknown, wanted: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK " : "!! "} ${what}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(wanted)}`}`,
	);
}

async function refusalOf(run: () => Promise<unknown>): Promise<string> {
	try {
		await run();
		return "not refused";
	} catch (failure: unknown) {
		return failure instanceof Error ? failure.message : String(failure);
	}
}

const asked: [string, NetworkAsk][] = [];
const written: unknown[][] = [];
const opened: string[] = [];
const NOTES: readonly VaultNote[] = [
	{ path: "Tasks/a.md", name: "a", props: { title: "Water", tags: ["home"] } },
	{ path: "Tasks/b.md", name: "b", props: { title: "Pay rent" } },
];
const slot: VaultSlot = {
	canCreate: true,
	canUpdate: true,
	canRemove: true,
	list: async () => ({ rows: [], total: 0 }),
	get: async () => null,
	create: async (draft) => {
		written.push(["create", draft]);
		return null;
	},
	update: async (address, patch) => {
		written.push(["update", address, patch]);
		return null;
	},
	remove: async (address) => {
		written.push(["remove", address]);
		return null;
	},
};
const days = arrayGateway(
	[
		{ date: "2026-10-01", done: 2, area: "home" },
		{ date: "2026-10-01", done: 1, area: "work" },
		{ date: "2026-10-02", done: 4, area: "home" },
	],
	{},
	"packs-test/days",
);
let isConfirmed = false;
const portsOf = (answer: string, status = 200): ImplementationPorts => ({
	self: "t1/probe",
	catalogue: NO_CATALOGUE_PORT,
	commandLine: { can: false, run: async () => ({ ok: false, output: "", failure: "none" }) },
	workingDirectory: undefined,
	network: {
		can: true,
		request: async (url, ask) => {
			asked.push([url, ask]);
			return { status, text: answer };
		},
	},
	vault: {
		can: true,
		folder: (path) => {
			written.push(["folder", path]);
			return slot;
		},
		notesTagged: async (tag) => NOTES.filter((note) => JSON.stringify(note.props["tags"] ?? []).includes(tag)),
		notesMatching: async (text) =>
			NOTES.filter((note) => JSON.stringify(note.props).toLowerCase().includes(text.toLowerCase())),
		open: (path) => void opened.push(path),
	},
	refs: {
		read: async () => null,
		watch: () => () => {},
		get: (ref) => (ref === "t1/days" ? days : null),
		described: () => null,
	},
	confirm: async () => isConfirmed,
});

const json = JSON.stringify({ data: { items: [{ title: "One" }, { title: "Two" }, { title: "Three" }], count: 3 } });
check(
	"fetch reads one value at a path",
	await new FetchValueQuery({ url: "https://x.test/a", path: "data.count" }, portsOf(json)).get(),
	3,
);
const page = await new FetchRowsQuery({ url: "https://x.test/a", path: "data.items" }, portsOf(json)).list({
	offset: 1,
	limit: 1,
});
check(
	"fetch-rows pages a list at a path",
	[page.rows.map((row) => Reflect.get(row, "title")), page.total],
	[["Two"], 3],
);
check(
	"fetch-rows refuses a path that is not a list",
	await refusalOf(() => new FetchRowsQuery({ url: "https://x.test/a", path: "data.count" }, portsOf(json)).list()),
	"https://x.test/a answered data.count with something that is not a list",
);
check(
	"a failed answer is refused with its status",
	await refusalOf(() => new FetchValueQuery({ url: "https://x.test/a" }, portsOf("", 500)).get()),
	"https://x.test/a answered 500",
);
check(
	"fetch with no URL asks for one",
	await refusalOf(() => new FetchValueQuery({}, portsOf(json)).get()),
	"no address: type the URL in the settings window",
);
await new FetchSendCommand({ url: "https://x.test/hook" }, portsOf("")).run({ note: "hi" });
check("fetch-send posts what it was sent as JSON", asked.at(-1), [
	"https://x.test/hook",
	{ method: "POST", body: '{"note":"hi"}', headers: { "content-type": "application/json" } },
]);

const tagged = await new TagQuery({ tag: "#home" }, portsOf("")).list();
check(
	"tag lists the notes carrying it, as rows with their properties",
	tagged.rows.map((row) => [row.ref, row["title"]]),
	[["Tasks/a.md", "Water"]],
);
check(
	"search matches a property",
	(await new SearchQuery({ text: "rent" }, portsOf("")).list()).rows.map((row) => row.ref),
	["Tasks/b.md"],
);
check("an empty search lists nothing", (await new SearchQuery({ text: " " }, portsOf("")).list()).total, 0);

written.length = 0;
await new FolderCreateCommand({ path: "Tasks" }, portsOf("")).run({ name: "c", title: "New", body: "text" });
await new FolderUpdateCommand({ path: "Tasks" }, portsOf("")).run({ ref: "Tasks/a.md", title: "Water plants" });
await new FolderRemoveCommand({ path: "Tasks" }, portsOf("")).run({ ref: "Tasks/b.md" });
await new FileSetCommand({ path: "Tasks/a.md", field: "done" }, portsOf("")).run(true);
check("folder and file commands write through the folder slot", written, [
	["folder", "Tasks"],
	["create", { name: "c", props: { title: "New" }, body: "text" }],
	["folder", "Tasks"],
	["update", { path: "Tasks/a.md" }, { props: { title: "Water plants" } }],
	["folder", "Tasks"],
	["remove", { path: "Tasks/b.md" }],
	["folder", "Tasks"],
	["update", { path: "Tasks/a.md" }, { props: { done: true } }],
]);
check(
	"a folder command with no folder asks for one",
	await refusalOf(() => new FolderCreateCommand({}, portsOf("")).run({ name: "x" })),
	"no folder: type its path in the settings window",
);
new OpenCommand({}, portsOf("")).run({ ref: "Tasks/a.md" });
check("open opens the note it was sent", opened, ["Tasks/a.md"]);

check(
	"a number over another widget's rows",
	await new NumberQuery({ rows: "t1/days", algorithm: "sum", field: "done" }, portsOf("")).get(),
	7,
);
const series = await new SeriesQuery({ rows: "t1/days", measure: "sum", field: "done" }, portsOf("")).list();
check(
	"a series sums per day, oldest first",
	series.rows.map((row) => [row.date, row.value]),
	[
		["2026-10-01", 3],
		["2026-10-02", 4],
	],
);
const shares = await new BreakdownQuery({ rows: "t1/days", groupBy: "area" }, portsOf("")).list();
check(
	"a breakdown counts per value with its share",
	shares.rows.map((row) => [row.label, row.value, row.share]),
	[
		["home", 2, 0.667],
		["work", 1, 0.333],
	],
);
check("a streak answers its longest run", (await new StreakQuery({ rows: "t1/days" }, portsOf("")).get()).best, 2);
check(
	"a stat over no list asks for one",
	await refusalOf(() => new NumberQuery({}, portsOf("")).get()),
	"no list: pick the widget whose rows are counted in the settings window",
);

isConfirmed = false;
check(
	"a push nobody confirms sends nothing",
	await refusalOf(() => new PushCommand({}, portsOf("")).run(undefined)),
	"the push was not confirmed, so nothing was sent",
);

const listed = (spec: Parameters<typeof sourcesFor>[0]): string[] => sourcesFor(spec).map((entry) => entry.id);
const forTitles = listed({ kind: "collection", describes: { title: { type: "line" } } });
check(
	"a list of titles is offered sources of any shape, not commits",
	[forTitles.includes("@obsidian/tag"), forTitles.includes("@core/fetch-rows"), forTitles.includes("@git/commits")],
	[true, true, false],
);
check(
	"a list reading sha and subject is offered commits",
	listed({ kind: "collection", describes: { sha: { type: "line" }, subject: { type: "line" } } }).includes(
		"@git/commits",
	),
	true,
);
const forNumber = listed({ kind: "value", type: "number" });
check(
	"a number prop is offered one number, not a branch",
	[forNumber.includes("@stats/number"), forNumber.includes("@git/current-branch")],
	[true, false],
);
check(
	"every pack is registered under its own name",
	["@core", "@obsidian", "@stats", "@git"].map((pack) =>
		[...registeredQueries(), ...registeredCommands()].some((entry) => entry.id.startsWith(`${pack}/`)),
	),
	[true, true, true, true],
);

const everyId = [...registeredQueries(), ...registeredCommands()].map((entry) => entry.id);
check(
	"no two implementations answer to one id",
	everyId.filter((id, at) => everyId.indexOf(id) !== at),
	[],
);
check(
	"and a pack naming one id twice is refused",
	await refusalOf(async () => {
		const [count] = registeredQueries().filter((entry) => entry.id === "@stats/count");
		if (!count) throw new Error("no count to name twice");
		definePack({
			id: "@twice",
			title: "Twice",
			queries: [
				{ ...count, id: "@twice/count" },
				{ ...count, id: "@twice/count" },
			],
			commands: [],
		});
	}),
	"@twice/count names two implementations of one pack",
);

console.log(`\n${failed === 0 ? "packs: clean" : `packs: ${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
