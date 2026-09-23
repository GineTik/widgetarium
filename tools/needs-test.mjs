import esbuild from "esbuild";
import { readFile } from "node:fs/promises";
import { propsOfEveryShippedWidget } from "./widget-props.mjs";
import { TEXT_LOADERS } from "../apps/obsidian/build.mjs";

const built = await esbuild.build({
	stdin: {
		contents: `export * from "./packages/core/src/gateway/create"; export * from "./packages/core/src/gateway/fields"; export * from "./packages/core/src/gateway/resolve-needs"; export * from "./packages/core/src/gateway/mapped"; export { needsOf } from "./packages/core/src/gateway/props.js";`,
		resolveDir: process.cwd(),
		loader: "js",
	},
	bundle: true,
	loader: TEXT_LOADERS,
	write: false,
	format: "esm",
	platform: "neutral",
	logLevel: "silent",
});
const gateway = await import(
	`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString("base64")}`
);

let failed = 0;
function check(name, ok, detail = "") {
	if (ok) {
		console.log(`ok   ${name}`);
		return;
	}
	failed += 1;
	console.error(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

const NEEDS = {
	days: { type: "date", many: true, required: true, aka: ["entries", "dates", "log"] },
	title: { type: "text", aka: ["name"] },
	goal: { type: "number" },
};

const HABITS = [
	{
		path: "Habits/Reading.md",
		name: "Reading",
		props: { entries: ["2026-08-01", "2026-08-02"], name: "Reading", target: 21 },
	},
	{ path: "Habits/Exercise.md", name: "Exercise", props: { entries: ["2026-08-03"], name: "Exercise" } },
];

const fieldsOf = gateway.fieldsOf;
const resolveNeeds = gateway.resolveNeeds;

{
	const fields = fieldsOf(HABITS);
	const entries = fields.find((field) => field.prop === "entries");
	check(
		"fields: a list of days reports its element type, not just list",
		entries?.type === "list" && entries?.elementType === "date" && entries?.many === true,
		JSON.stringify(entries),
	);
	const target = fields.find((field) => field.prop === "target");
	check("fields: a plain number is not many", target?.elementType === "number" && target?.many === false);
}

{
	const { map, unresolved, missing } = resolveNeeds(NEEDS, fieldsOf(HABITS));
	check("ladder: an alias resolves the need nobody named", map.days === "entries", JSON.stringify(map));
	check("ladder: an exact name wins", map.title === "name");
	check(
		"ladder: the only field of the wanted type is taken even under another name",
		map.goal === "target",
		JSON.stringify(map),
	);
	check(
		"ladder: nothing is missing while every required need resolved",
		missing.length === 0 && unresolved.length === 0,
	);
}

{
	const renamed = HABITS.map(({ props, ...rest }) => ({ ...rest, props: { name: props.name, kept: props.entries } }));
	const { map } = resolveNeeds(NEEDS, fieldsOf(renamed));
	check(
		"drift: an unrecognisable name still resolves while it is the only date list",
		map.days === "kept",
		JSON.stringify(map),
	);
}

{
	const twoLists = HABITS.map(({ props, ...rest }) => ({
		...rest,
		props: { name: props.name, kept: props.entries, skipped: ["2026-08-09"] },
	}));
	const { map, missing } = resolveNeeds(NEEDS, fieldsOf(twoLists));
	check(
		"drift: a second list of days is the question, not a guess",
		map.days === undefined && missing.includes("days"),
		JSON.stringify(map),
	);
}

{
	const twoLists = HABITS.map(({ props, ...rest }) => ({
		...rest,
		props: { name: props.name, kept: props.entries, skipped: ["2026-08-09"] },
	}));
	const { map, missing } = resolveNeeds(NEEDS, fieldsOf(twoLists), { days: "skipped" });
	check("ladder: what the person picked wins over every guess", map.days === "skipped" && missing.length === 0);
}

{
	const { map } = resolveNeeds(
		{ due: { type: "date", aka: ["due date"] } },
		fieldsOf([{ props: { "due-date": "2026-08-01" } }]),
	);
	check("ladder: punctuation and case do not hide a name", map.due === "due-date", JSON.stringify(map));
}

function folderStandIn(records, { canWrite = true } = {}) {
	const held = records.map((record) => ({ ...record, ref: record.path }));
	const written = [];
	const handlers = {
		list: (query) => gateway.applyQuery(held, query),
		get: (ref) => held.find((row) => row.ref === ref) ?? null,
		describe: () => fieldsOf(records),
	};
	if (canWrite) {
		handlers.update = (input) => {
			written.push(input);
			return held.find((row) => row.ref === input.ref) ?? null;
		};
	}
	return { gateway: gateway.collectionGateway({ id: "folder:Habits", handlers }), written };
}

{
	const { gateway: base } = folderStandIn(HABITS);
	const mapped = gateway.mappedCollection(base, { needs: { ...NEEDS, colour: { type: "text" } } });
	const listed = await mapped.list();
	const first = listed.rows[0];
	check(
		"mapped: the widget reads the need, never the property",
		Array.isArray(first.days) && first.days.length === 2,
		JSON.stringify(first.days),
	);
	check(
		"mapped: the record keeps what it already carried",
		first.path === "Habits/Reading.md" && first.name === "Reading",
	);
	check("mapped: a need the folder cannot answer arrives as nothing, not as a throw", first.colour === undefined);
}

{
	const { gateway: base } = folderStandIn([{ path: "a.md", props: { entries: "2026-08-01", name: "One" } }]);
	const mapped = gateway.mappedCollection(base, { needs: NEEDS });
	const listed = await mapped.list();
	check(
		"coercion: one day where many were declared arrives wrapped",
		JSON.stringify(listed.rows[0].days) === '["2026-08-01"]',
	);
}

{
	const { gateway: base } = folderStandIn([
		{ path: "a.md", props: { entries: ["2026-08-01", "not a day", ""], name: "One" } },
	]);
	const mapped = gateway.mappedCollection(base, { needs: NEEDS });
	const listed = await mapped.list();
	check(
		"coercion: a value that will not convert is dropped, not drawn",
		JSON.stringify(listed.rows[0].days) === '["2026-08-01"]',
	);
}

{
	const { gateway: base, written } = folderStandIn(HABITS);
	const mapped = gateway.mappedCollection(base, { needs: NEEDS });
	await mapped.update({ ref: "Habits/Reading.md", data: { days: ["2026-08-04"] } });
	check(
		"mapped: a write goes back under the property the vault uses",
		written[0]?.data?.props?.entries?.[0] === "2026-08-04",
		JSON.stringify(written[0]),
	);
	check("mapped: a write names no need the vault never had", written[0]?.data?.days === undefined);
}

{
	const { gateway: base } = folderStandIn(HABITS, { canWrite: false });
	const mapped = gateway.mappedCollection(base, { needs: NEEDS });
	check("mapped: a folder that refuses a write still refuses it through the map", mapped.update.can().can === false);
}

{
	const wanting = { ...NEEDS, colour: { type: "text", required: true } };
	const seen = resolveNeeds(wanting, fieldsOf(HABITS));
	check(
		"ladder: a required need nothing answers is reported missing",
		seen.missing.includes("colour"),
		JSON.stringify(seen),
	);
}

{
	const { gateway: base, written } = folderStandIn(HABITS);
	const wanting = { ...NEEDS, colour: { type: "text", required: true } };
	const mapped = gateway.mappedCollection(base, { needs: wanting });
	let refusal = null;
	await mapped.update({ ref: "Habits/Reading.md", data: { colour: "red" } }).catch((failure) => (refusal = failure));
	check(
		"write: a need no property answers is refused, never dropped in silence",
		refusal !== null,
		JSON.stringify(written),
	);
	check(
		"write: the refusal names the need the person would look for",
		String(refusal?.message ?? "").includes("colour"),
		String(refusal?.message),
	);
	check("write: nothing reached the folder", written.length === 0);
}

{
	const { gateway: base } = folderStandIn(HABITS);
	const wanting = { ...NEEDS, colour: { type: "text", required: true } };
	const mapped = gateway.mappedCollection(base, { needs: wanting });
	const listed = await mapped.list({ where: [{ prop: "colour", op: "is", value: "red" }] });
	check(
		"read: a condition on an unanswered need narrows nothing rather than to nothing",
		listed.rows.length === HABITS.length,
		String(listed.rows.length),
	);
}

{
	const { gateway: base } = folderStandIn(HABITS);
	const mapped = gateway.mappedCollection(base, { needs: NEEDS });
	const listed = await mapped.list({ where: [{ prop: "title", op: "is", value: "Reading" }] });
	check(
		"read: a condition on an answered need is asked under the vault's own property",
		listed.rows.length === 1,
		String(listed.rows.length),
	);
}

{
	const { existsSync, readdirSync } = await import("node:fs");
	const scopes = readdirSync("registry").filter((name) => name.startsWith("@"));
	const shipped = scopes.flatMap((scope) =>
		readdirSync(`registry/${scope}`)
			.filter((name) => !name.endsWith(".js") && !name.endsWith(".css"))
			.map((name) => `registry/${scope}/${name}/manifest.generated.json`)
			.filter((path) => existsSync(path)),
	);
	const declaring = [];
	for (const path of shipped) {
		const held = JSON.parse(await readFile(path, "utf8"));
		if (held.settings !== undefined) declaring.push(path);
	}
	check(
		"no shipped widget is tuned by a setting — every one of them is a prop",
		declaring.length === 0,
		declaring.join(", "),
	);
}

{
	const manifest = JSON.parse(await readFile("registry/@default/streak/manifest.generated.json", "utf8"));
	const needs = gateway.needsOf((await propsOfEveryShippedWidget())["@default/streak"].days);
	const rows = manifest.preview.props.days.rows;
	const { map } = resolveNeeds(needs, fieldsOf(rows));
	check(
		"shipped: the streak names no property through a setting at all",
		manifest.settings === undefined,
		JSON.stringify(manifest.settings),
	);
	check("shipped: it asks for what it reads as needs instead", Object.keys(needs).sort().join(","), "date,done");
	check("shipped: and its own preview rows answer the kept need", map.done === "done", JSON.stringify(map));
}

{
	const noteAndItsNeighbours = [
		{ props: { date: "2026-09-12", amount: 123, note: "12345", widgetarium: { wgId: "f8fb1240" } } },
	];
	const fields = gateway.fieldsOf(noteAndItsNeighbours);
	const offered = fields.map((field) => field.prop);
	const needs = {
		amount: { type: "number", aka: ["value"] },
		date: { type: "date", aka: ["day"] },
		note: { type: "text", aka: ["label"] },
	};
	const { map } = gateway.resolveNeeds(needs, fields);

	check(
		"a property holding an object is offered to nothing",
		offered.includes("widgetarium") === false,
		offered.join(","),
	);
	check("a note that reads as a number still answers a need for text", map.note, "note");
	check(
		"and nothing lands on the plugin's own bookkeeping",
		Object.values(map).includes("widgetarium") === false,
		JSON.stringify(map),
	);
}

console.log(failed ? `needs gate: ${failed} failure(s)` : "needs gate: clean");
process.exit(failed ? 1 : 0);
