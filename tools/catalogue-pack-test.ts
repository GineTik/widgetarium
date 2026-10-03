import type { ImplementationPorts } from "../packages/core/src/engine/packs.ts";
import type { CataloguePort } from "../packages/core/src/engine/catalogue-port.ts";
import type { MergedEntry } from "../packages/core/src/catalogue-entries.ts";
import { createInstallJobs, INSTALL_JOBS } from "../packages/core/src/engine/install-jobs.ts";
import type { RunInstall } from "../packages/core/src/engine/install-jobs.ts";
import { CATALOGUE_REQUESTS } from "../packages/core/src/engine/catalogue-requests.ts";
import { placeWidget, receiveDrops } from "../packages/core/src/surface/drop-receivers.ts";
import type { PlaceAt } from "../packages/core/src/surface/drop-receivers.ts";
import { placeInto } from "../packages/core/src/tree-drop.ts";
import type { BoxNode } from "../packages/core/src/tree-nodes.ts";
import { normalizeBoard } from "../packages/core/src/model.ts";
import { TEMPLATES } from "../packages/core/src/templates.ts";
import { DOC_PAGES } from "../packages/core/src/docs.ts";
import {
	ClearFiltersCommand,
	CountQuery,
	DocPageQuery,
	DocPagesQuery,
	EntriesQuery,
	InstallCommand,
	PacksQuery,
	PickCommand,
	PlaceCommand,
	SaidQuery,
	ShowingQuery,
	TemplatesQuery,
	cataloguePack,
} from "../packages/packs/catalogue/src/index.ts";

let failed = 0;
let checks = 0;
function check(what: string, got: unknown, wanted: unknown): void {
	checks += 1;
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "ok  " : "FAIL"} ${what}${ok ? "" : ` — got ${JSON.stringify(got)}, wanted ${JSON.stringify(wanted)}`}`,
	);
}

async function refusalOf(run: () => Promise<unknown>): Promise<string> {
	try {
		await run();
		return "no refusal";
	} catch (thrown) {
		return thrown instanceof Error ? thrown.message : String(thrown);
	}
}

const tick = (): Promise<void> => new Promise((settle) => setTimeout(settle, 0));

function entryOf(
	id: string,
	title: string,
	held: { installed: boolean; keywords: string[]; update?: boolean },
): MergedEntry {
	const manifest = { id, title, description: `${title} draws`, keywords: held.keywords };
	return {
		definition: { manifest, installed: held.installed },
		offer: held.installed && !held.update ? null : { manifest, installed: false },
		manifest,
		installed: held.installed,
		update: held.update ? { here: "1111111", there: "2222222" } : null,
	};
}

const ENTRIES: MergedEntry[] = [
	entryOf("@default/task-card", "Task card", { installed: true, keywords: ["tasks"] }),
	entryOf("@demo/clock", "Clock", { installed: false, keywords: ["time"] }),
	entryOf("@default/streak", "Habit streak", { installed: true, keywords: ["habit", "tasks"], update: true }),
];

const installed: string[] = [];
let installRun: RunInstall = async () => ({ ok: true });

const port: CataloguePort = {
	can: true,
	entries: async () => ENTRIES,
	entryOf: (widget) => ENTRIES.find((entry) => entry.manifest["id"] === widget) ?? null,
	templates: () => TEMPLATES,
	install: (widget) => {
		installed.push(widget);
		return INSTALL_JOBS.start(widget, installRun);
	},
	uninstall: async () => ({ ok: true }),
	applyTemplate: async () => ({ ok: true }),
	place: placeWidget,
	openView: () => undefined,
	subscribe: () => () => undefined,
	jobs: INSTALL_JOBS,
	requests: CATALOGUE_REQUESTS,
	previewRegistry: null,
	previewHost: null,
};

const values = new Map<string, unknown>();
const written: [string, unknown][] = [];

const ports: ImplementationPorts = {
	self: "list/getEntries",
	commandLine: { can: false, run: async () => ({ ok: false, output: "", failure: "none" }) },
	workingDirectory: undefined,
	network: { can: false, request: () => Promise.reject(new Error("no network")) },
	vault: {
		can: false,
		folder: () => {
			throw new Error("no vault");
		},
		notesTagged: () => Promise.reject(new Error("no vault")),
		notesMatching: () => Promise.reject(new Error("no vault")),
		open: () => undefined,
	},
	refs: {
		read: async (ref) => values.get(ref) ?? null,
		watch: () => () => undefined,
		get: (ref) =>
			values.has(ref)
				? {
						update: async (next: unknown) => {
							written.push([ref, next]);
							values.set(ref, next);
						},
					}
				: null,
		described: () => null,
	},
	catalogue: port,
	confirm: async () => true,
};

const FILTERS = {
	keyword: "s/getValue",
	showing: "show/getSelection",
	pack: "packs/getSelection",
	tag: "tags/getSelection",
};

const ids = async (): Promise<string[]> => (await new EntriesQuery(FILTERS, ports).list()).rows.map((row) => row.id);

const setFilters = (held: Readonly<Record<string, unknown>>): void => {
	values.clear();
	for (const [ref, value] of Object.entries(held)) values.set(ref, value);
};

console.log("\n— the pack names every implementation under its own id —");
check(
	"every query and command is named @catalogue/…",
	[...cataloguePack.queries, ...cataloguePack.commands].every((one) => one.id.startsWith("@catalogue/")),
	true,
);
check(
	"removing a widget always asks; installing, picking and placing are what the person pressed",
	cataloguePack.commands.map((one) => [one.id, one.consent]),
	[
		["@catalogue/install", "free"],
		["@catalogue/uninstall", "always"],
		["@catalogue/pick", "free"],
		["@catalogue/place", "free"],
		["@catalogue/use-template", "free"],
		["@catalogue/open-view", "free"],
		["@catalogue/clear-filters", "free"],
	],
);

console.log("\n— the entries are the merged catalogue, narrowed by values other widgets hold —");
setFilters({});
check("with nothing typed or picked every widget is listed", await ids(), [
	"@default/task-card",
	"@demo/clock",
	"@default/streak",
]);
const rows = (await new EntriesQuery(FILTERS, ports).list()).rows;
check(
	"each row says what pressing it does",
	rows.map((row) => [row.id, row.action, row.scope, row.name]),
	[
		["@default/task-card", "add", "@default", "Task card"],
		["@demo/clock", "install", "@demo", "Clock"],
		["@default/streak", "update", "@default", "Habit streak"],
	],
);
check("an update names both commits", rows[2]?.update, { here: "1111111", there: "2222222" });
check(
	"the row's address is the widget's id",
	rows.map((row) => row.ref),
	["@default/task-card", "@demo/clock", "@default/streak"],
);
setFilters({ "show/getSelection": "installed" });
check("Installed leaves out what must be fetched", await ids(), ["@default/task-card", "@default/streak"]);
setFilters({ "show/getSelection": "update" });
check("Update ready keeps only what has a newer commit", await ids(), ["@default/streak"]);
setFilters({ "packs/getSelection": "@demo" });
check("a pack narrows to its own widgets", await ids(), ["@demo/clock"]);
setFilters({ "tags/getSelection": "habit" });
check("a tag narrows to the widgets naming it", await ids(), ["@default/streak"]);
setFilters({ "s/getValue": "clock" });
check("a search ranks and narrows", await ids(), ["@demo/clock"]);
setFilters({ "show/getSelection": "installed", "tags/getSelection": "tasks" });
const COUNT_ASKED = ["all", "installed", "update", "shown", "narrowed"] as const;
check(
	"the count answers one number for each thing it is asked",
	await Promise.all(COUNT_ASKED.map((which) => new CountQuery({ ...FILTERS, which }, ports).get())),
	[3, 2, 1, 2, 2],
);
check(
	"the show filter counts the whole catalogue, not what is shown",
	(await new ShowingQuery(FILTERS, ports).list()).rows.map((row) => [row.name, row.count]),
	[
		["all", 3],
		["installed", 2],
		["update", 1],
	],
);

console.log("\n— facets narrow themselves, never the widgets —");
setFilters({});
check(
	"packs are the ids' own halves, counted",
	(await new PacksQuery({ keyword: "packs/getFilter" }, ports).list()).rows.map((row) => [
		row.name,
		row.count,
		row.mark,
	]),
	[
		["@default", 2, "D"],
		["@demo", 1, "D"],
	],
);
setFilters({ "packs/getFilter": "dem" });
check(
	"a pack search narrows the packs",
	(await new PacksQuery({ keyword: "packs/getFilter" }, ports).list()).rows.map((row) => row.name),
	["@demo"],
);
check("and leaves the widgets whole", (await ids()).length, 3);

console.log("\n— what the catalogue is asked for —");
check("browsing, it says so", (await new SaidQuery({}, ports).get()).title, "Widgets");
const asked = CATALOGUE_REQUESTS.ask({ mode: "place" });
const said = await new SaidQuery({}, ports).get();
check("asked by a board's add, it says where the pick lands", [said.title, said.isAsking], ["Add a widget", true]);
await new PickCommand({}, ports).run({ widget: "@default/task-card" });
check("a pick answers the board that asked", await asked, "@default/task-card");
check("and fetches nothing it already has", installed, []);
check(
	"with nothing waiting, a pick says how to place instead",
	await refusalOf(() => new PickCommand({}, ports).run({ widget: "@default/task-card" })),
	"Nothing is waiting for a widget: drag the card onto a board, or press the add button at the end of a column first",
);
const askedAgain = CATALOGUE_REQUESTS.ask({ mode: "fill" });
let holdInstall: (answered: { ok: boolean; failure?: string }) => void = () => undefined;
installRun = (onStep) =>
	new Promise((settle) => {
		onStep({ done: 0, total: 0 });
		holdInstall = settle;
	});
await new PickCommand({}, ports).run({ widget: "@demo/clock" });
check("a missing widget is picked at once", await askedAgain, "@demo/clock");
check("and its install starts beside the pick", installed, ["@demo/clock"]);
await tick();
check("the install is a job anyone can read", INSTALL_JOBS.jobOf("@demo/clock")?.state, "fetching");
check(
	"and the entry carries the same job",
	(await new EntriesQuery(FILTERS, ports).list()).rows.find((row) => row.id === "@demo/clock")?.job?.state,
	"fetching",
);
holdInstall({ ok: true });
await tick();
check("a finished install leaves no job behind", INSTALL_JOBS.jobOf("@demo/clock"), null);

console.log("\n— an install is one job per widget, however often it is asked —");
const jobs = createInstallJobs();
let runs = 0;
let finish: (answered: { ok: boolean; failure?: string }) => void = () => undefined;
const counted: RunInstall = (onStep) => {
	runs += 1;
	return new Promise((settle) => {
		onStep({ done: 1, total: 3 });
		finish = settle;
	});
};
const first = jobs.start("@demo/clock", counted);
const second = jobs.start("@demo/clock", counted);
check("a second ask joins the first", [first === second, runs], [true, 1]);
check("the job counts the files as they land", jobs.jobOf("@demo/clock"), {
	widget: "@demo/clock",
	state: "writing",
	done: 1,
	total: 3,
	failure: null,
});
finish({ ok: false, failure: "the repository answered 404" });
check("a failed install says why", await first, { ok: false, failure: "the repository answered 404" });
check("and stays readable as failed", jobs.jobOf("@demo/clock")?.state, "failed");
const retried = jobs.start("@demo/clock", async () => ({ ok: true }));
check("a retry is a new job", [await retried, jobs.jobOf("@demo/clock")], [{ ok: true }, null]);

console.log("\n— a drop goes where it was aimed, through the receiver that took it —");
const placed: [string, PlaceAt][] = [];
const stop = receiveDrops({
	id: "board-test",
	element: {} as HTMLElement,
	aim: () => null,
	rest: () => undefined,
	place: (widget, at) => {
		placed.push([widget, at]);
		return true;
	},
});
installRun = async () => ({ ok: true });
const target = { kind: "beside" as const, box: [0], at: 1 };
await new PlaceCommand({}, ports).run({ widget: "@demo/clock", at: { kind: "board", board: "board-test", target } });
check("the board that was aimed at receives it", placed, [
	["@demo/clock", { kind: "board", board: "board-test", target }],
]);
check("and a missing widget starts installing", installed, ["@demo/clock", "@demo/clock"]);
stop();
check(
	"a board that is gone refuses the drop",
	await refusalOf(() =>
		new PlaceCommand({}, ports).run({ widget: "@demo/clock", at: { kind: "board", board: "board-test", target } }),
	),
	"@demo/clock was not placed: the spot it was dropped on is gone",
);

console.log("\n— a placed widget becomes a new leaf at the target —");
const root: BoxNode = normalizeBoard({
	v: 2,
	tiles: [{ id: "a", widget: "@x/a" }],
	layout: { dir: "row", of: [{ dir: "column", keep: true, of: [{ id: "a" }] }] },
}).layout;
const grown = placeInto(root, { id: "new", ratio: 1 }, { kind: "beside", box: [0], at: 0 });
check(
	"it stands where it was dropped",
	JSON.stringify(grown).indexOf('"new"') < JSON.stringify(grown).indexOf('"a"'),
	true,
);
check(
	"a target that names no box changes nothing",
	placeInto(root, { id: "new", ratio: 1 }, { kind: "beside", box: [7], at: 0 }) === root,
	true,
);
const neverDocked = normalizeBoard({
	v: 2,
	tiles: [],
	layout: {
		dir: "row",
		of: [{ dir: "column", keep: true, of: [{ dir: "column", collapse: { into: "sheet", docks: false }, of: [] }] }],
	},
}).layout.of[0];
check(
	"a box can say it never docks",
	neverDocked && "of" in neverDocked
		? neverDocked.of[0] && "collapse" in neverDocked.of[0] && neverDocked.of[0].collapse
		: null,
	{ into: "sheet", toggle: "always", docks: false },
);

console.log("\n— clearing the filters empties each value in its own shape —");
setFilters({ "s/getValue": "clock", "tags/getSelection": null });
written.length = 0;
await new ClearFiltersCommand({ targets: ["s/getValue", "tags/getSelection"] }, ports).run();
check("a text goes back to empty and anything else to nothing", written, [
	["s/getValue", ""],
	["tags/getSelection", null],
]);

console.log("\n— the docs and the templates —");
setFilters({ "s/getValue": "registry" });
check(
	"the pages narrow to what the search names",
	(await new DocPagesQuery({ keyword: "s/getValue" }, ports).list()).rows.map((row) => row.name),
	["publish-your-widget"],
);
setFilters({ "pages/getSelection": "publish-your-widget" });
check(
	"the page shown is the one picked",
	(await new DocPageQuery({ picked: "pages/getSelection" }, ports).get())?.body === DOC_PAGES[1]?.body,
	true,
);
check(
	"and it carries its own action, its source and nothing after the last",
	await new DocPageQuery({ picked: "pages/getSelection" }, ports)
		.get()
		.then((page) => [page?.action?.label, page?.source, page?.next]),
	["Email your repository", "docs/catalogue/publish-your-widget.md", null],
);
setFilters({});
check(
	"with nothing picked the first page is shown",
	(await new DocPageQuery({ picked: "pages/getSelection" }, ports).get())?.body === DOC_PAGES[0]?.body,
	true,
);
check("and it names the page after it", (await new DocPageQuery({ picked: "pages/getSelection" }, ports).get())?.next, {
	id: "publish-your-widget",
	title: "Publish your widget",
});
const template = (await new TemplatesQuery({ keyword: "s/getValue" }, ports).list()).rows[0];
check("a template row carries its sketch", Array.isArray(template?.sketch) && (template?.sketch.length ?? 0) > 0, true);
check("and every widget it stands on", (template?.widgets.length ?? 0) > 0, true);

console.log("\n— an install reached from the card is the port's —");
installed.length = 0;
await new InstallCommand({}, ports).run({ widget: "@demo/clock" });
check("installing asks the port once", installed, ["@demo/clock"]);
installRun = async () => ({ ok: false, failure: "no such commit" });
check(
	"and a refused install refuses the command",
	await refusalOf(() => new InstallCommand({}, ports).run({ widget: "@demo/clock" })),
	"no such commit",
);

console.log(`\n${checks - failed}/${checks} catalogue pack checks passed`);
process.exit(failed === 0 ? 0 : 1);
