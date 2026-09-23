import { JSDOM } from "jsdom";
import { buildMirror } from "./mirror.mjs";

buildMirror();

const dom = new JSDOM("<!doctype html><body></body>");
for (const key of ["window", "document", "Node", "Element", "HTMLElement", "SVGElement", "getComputedStyle"]) {
	globalThis[key] = key === "window" ? dom.window : dom.window[key];
}

const { WidgetRegistry } = await import("./.mjs-cache/registry.mjs");

const ROOT = ".widgetarium/widgets";

function vaultOf(files) {
	const adapter = {
		async exists(path) {
			return Object.hasOwn(files, path) || Object.keys(files).some((key) => key.startsWith(`${path}/`));
		},
		async list(path) {
			const folders = new Set();
			const found = [];
			for (const key of Object.keys(files)) {
				if (!key.startsWith(`${path}/`)) continue;
				const rest = key.slice(path.length + 1);
				const cut = rest.indexOf("/");
				if (cut === -1) found.push(key);
				else folders.add(`${path}/${rest.slice(0, cut)}`);
			}
			return { files: found, folders: [...folders] };
		},
		async read(path) {
			return files[path];
		},
	};
	return { vault: { adapter } };
}

const LIB = `export const RATE = 21;
export function streakOf(days) {
	return days.length;
}
`;

const WIDGET = `import { streakOf, RATE } from "@default/lib";
import { createWidget } from "widgetarium";
export default createWidget(function Probe({ days = [] }) {
	return h("b", null, streakOf(days) + "/" + RATE);
});
`;

const FILES = {
	[`${ROOT}/@default/lib.js`]: LIB,
	[`${ROOT}/@habit/probe/manifest.json`]: JSON.stringify({ id: "@habit/probe", title: "Probe" }),
	[`${ROOT}/@habit/probe/widget.jsx`]: WIDGET,
};

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

{
	const registry = new WidgetRegistry(vaultOf(FILES));
	await registry.load();
	const entry = registry.get("@habit/probe");

	check("the widget beside a lib still loads", Boolean(entry?.component), true);
	check("and nothing failed on the way", entry?.error ?? null, null);
	check("the lib is served under the scope's own name", registry.libs.has("@default/lib"), true);
	check("its exports are what the file exported", Object.keys(registry.libs.get("@default/lib")).sort(), [
		"RATE",
		"streakOf",
	]);
	check("and what the widget draws came from it", entry.component({ days: ["a", "b", "c"] }).props.children, "3/21");
}

{
	const registry = new WidgetRegistry(
		vaultOf({ ...FILES, [`${ROOT}/@habit/probe/widget.jsx`]: `import "nowhere";\nexport default () => null;\n` }),
	);
	await registry.load();
	const entry = registry.get("@habit/probe");
	check(
		"an import of something else is still refused",
		String(entry?.error ?? ""),
		'Error: cannot import "nowhere" — a widget may only import widgetarium, widgetarium/kit, widgetarium/kit/emojis, react, react-dom, @default/lib',
	);
}

{
	const said = [];
	const wasError = console.error;
	console.error = (...parts) => said.push(parts.join(" "));
	const registry = new WidgetRegistry(vaultOf({ ...FILES, [`${ROOT}/@default/lib.js`]: "export const broken = (" }));
	await registry.load();
	console.error = wasError;

	check(
		"a lib that will not parse is reported",
		said.some((line) => line.includes("@default/lib.js")),
		true,
	);
	check("and it is not served", registry.libs.has("@default/lib"), false);
	check(
		"so the widget that wanted it fails by name",
		String(registry.get("@habit/probe")?.error ?? "").includes("@default/lib"),
		true,
	);
}

{
	const registry = new WidgetRegistry(
		vaultOf({
			[`${ROOT}/@task/probe/manifest.json`]: JSON.stringify({ id: "@task/probe" }),
			[`${ROOT}/@task/probe/widget.jsx`]: "export default () => null;",
		}),
	);
	await registry.load();
	check("a scope with no lib loads exactly as before", Boolean(registry.get("@task/probe")?.component), true);
	check("and serves none", registry.libs.size, 0);
}

{
	// CONTEXT: the shipped file itself, copied only to be importable — a .js here would be CommonJS
	const { mkdtempSync, writeFileSync, readFileSync } = await import("node:fs");
	const { tmpdir } = await import("node:os");
	const nodePath = await import("node:path");
	const work = mkdtempSync(nodePath.join(tmpdir(), "wg-lib-"));
	const copy = nodePath.join(work, "lib.mjs");
	const mirrorAt = nodePath.resolve("tools/.mjs-cache");
	writeFileSync(
		copy,
		readFileSync("registry/@default/lib.js", "utf8")
			.replace('from "widgetarium/kit"', `from "file://${mirrorAt}/index.mjs"`)
			.replace('from "widgetarium"', `from "file://${mirrorAt}/gateway/match.mjs"`),
	);
	const { daysLogged, pressing, readLog, shapeOf, shiftedBy, streakOf } = await import(`file://${copy}`);

	const habits = [
		{ path: "Habits/Exercise.md", name: "Exercise", days: ["2026-08-29", "2026-08-30", "2026-08-31"] },
		{ path: "Habits/Reading.md", name: "Reading", days: ["2026-08-31"] },
	];
	const daily = [
		{ path: "Daily/2026-08-29.md", name: "2026-08-29", done: 8420 },
		{ path: "Daily/2026-08-30.md", name: "2026-08-30", done: 0 },
		{ path: "Daily/2026-08-31.md", name: "2026-08-31", done: true },
	];

	check("a note per habit is read as one", shapeOf(habits), "habit");
	check("a note per day as the other", shapeOf(daily), "day");
	check("every habit's dates come through", readLog(habits).length, 4);
	check(
		"and one habit alone is pickable",
		readLog(habits, { pick: "Reading" }).map((entry) => entry.date),
		["2026-08-31"],
	);
	check(
		"a day with nothing in it is not a day marked",
		readLog(daily).map((entry) => entry.date),
		["2026-08-29", "2026-08-31"],
	);
	check("a tick counts as one", readLog(daily).at(-1).value, 1);

	const run = readLog(habits, { pick: "Exercise" });
	check("a day shifted forward crosses the month end", shiftedBy("2026-08-31", 1), "2026-09-01");
	check("and shifted back crosses it the other way", shiftedBy("2026-09-01", -1), "2026-08-31");
	check("shifted by nothing is the same day", shiftedBy("2026-09-01", 0), "2026-09-01");

	check("three days in a row is a run of three", streakOf(run, { today: "2026-08-31" }).best, 3);
	check("and it is alive the day after the last one", streakOf(run, { today: "2026-09-01" }).current, 3);
	check("but not two days after", streakOf(run, { today: "2026-09-02" }).current, 0);
	const gapped = readLog([{ name: "x", days: ["2026-08-01", "2026-08-03", "2026-08-04"] }]);
	check("a missed day breaks a run when nothing forgives it", streakOf(gapped, { today: "2026-08-04" }).current, 2);
	check("and does not when maxGap does", streakOf(gapped, { maxGap: 1, today: "2026-08-04" }).current, 3);

	const notes = [
		{ ref: "Days/2026-08-29.md", name: "2026-08-29", done: 1 },
		{ ref: "Days/2026-08-30.md", name: "2026-08-30", done: null },
		{ ref: "Days/anything.md", name: "anything", date: "2026-08-31T09:00", done: 2 },
		{ ref: "Days/notes.md", name: "notes", done: 1 },
	];
	const logged = daysLogged(notes);
	check("a day note is found by the date in its name", logged.noteByDay.get("2026-08-29").ref, "Days/2026-08-29.md");
	check("a date property outranks the name", logged.noteByDay.get("2026-08-31").ref, "Days/anything.md");
	check("a note naming no day is no day", logged.noteByDay.has("notes"), false);
	check("an emptied property is a day not kept", [...logged.keptDays].sort(), ["2026-08-29", "2026-08-31"]);

	const written = [];
	const days = {
		update: (input) => written.push({ verb: "update", ...input }),
		create: (draft) => written.push({ verb: "create", ...draft }),
	};
	const press = pressing({ days, ...logged });
	await press("2026-08-29");
	check("pressing a kept day empties its property", written.at(-1), {
		verb: "update",
		ref: "Days/2026-08-29.md",
		data: { done: null },
	});
	await press("2026-08-30");
	check("pressing a day that has a note but no mark fills it", written.at(-1), {
		verb: "update",
		ref: "Days/2026-08-30.md",
		data: { done: 1 },
	});
	await press("2026-09-01");
	check("and pressing a day with no note at all makes one named for it", written.at(-1), {
		verb: "create",
		name: "2026-09-01",
		props: { done: 1 },
	});
}

{
	const { readFileSync } = await import("node:fs");
	const { buildWidget } = await import("./.mjs-cache/registry.mjs");
	// CONTEXT: the catalogue draws a widget nobody installed, so it compiles one straight off disk
	const drawn = buildWidget({
		code: readFileSync("registry/@default/heatmap/widget.tsx", "utf8"),
		path: "registry/@default/heatmap/widget.tsx",
		lib: readFileSync("registry/@default/lib.js", "utf8"),
		libPath: "registry/@default/lib.js",
		scope: "@default",
	});
	check("a widget is built from files nobody installed", typeof drawn, "function");

	let refused = "";
	try {
		buildWidget({ code: "export default 5;", path: "nowhere/widget.jsx" });
	} catch (failure) {
		refused = String(failure.message);
	}
	check(
		"and one exporting no component says so",
		refused,
		'nowhere/widget.jsx: the file must "export default createWidget(...)"',
	);
}

console.log(`\n${failed === 0 ? `lib gate: clean (${checks} checks)` : `lib gate: ${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
