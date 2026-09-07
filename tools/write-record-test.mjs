import { NO_PLUGIN, fakeTaskVault } from "./perf-fixture.mjs";

const { createHost } = await import("./.mjs-cache/host.mjs");

const FOLDER = "Tasks";
const CACHE_STAYS_SILENT = 100000;

let wrong = 0;

function check(label, held, wanted) {
	const ok = JSON.stringify(held) === JSON.stringify(wanted);
	if (!ok) wrong += 1;
	console.log(`${ok ? "OK " : "BAD"} ${label} → ${JSON.stringify(held)}`);
}

function claim(label, held) {
	if (!held) wrong += 1;
	console.log(`${held ? "OK " : "BAD"} ${label}`);
}

const slotOver = (app) => createHost(app, NO_PLUGIN).slot({ kind: "folder", path: FOLDER });

console.log("a write is visible to every reader before Obsidian reparses the note");
{
	const { app, files } = fakeTaskVault(FOLDER, 4, CACHE_STAYS_SILENT);
	const slot = slotOver(app);
	check("the card starts where it was", (await slot.list()).rows[0].props.status, "todo");

	const at = performance.now();
	const moved = await slot.update({ path: files[0].path }, { props: { status: "done" } });
	const blockedFor = performance.now() - at;

	check("update() reports the status it wrote", moved.props.status, "done");
	check("and keeps the fields it did not name", moved.props.title, "Task 0");
	check("get() agrees at once", (await slot.get({ path: files[0].path })).props.status, "done");
	check("the LIST the board draws agrees at once", (await slot.list()).rows.find((row) => row.path === files[0].path).props.status, "done");
	claim(`update() did not wait for the cache → ${blockedFor.toFixed(0)} ms`, blockedFor < 50);

	app.metadataCache.emit(files[0]);
	check("and still agrees once the cache catches up", (await slot.get({ path: files[0].path })).props.status, "done");
}

console.log("\na re-minted duplicate is not re-minted again by the next write");
{
	const { app, files } = fakeTaskVault(FOLDER, 3, CACHE_STAYS_SILENT);
	for (const file of files) file.props.widgetarium = { wgId: "shared" };
	const slot = slotOver(app);

	await slot.list();
	const first = await slot.update({ path: files[1].path }, { props: { status: "doing" } });
	claim(`the loser was re-minted → ${first.id}`, first.id !== "shared" && Boolean(first.id));

	const second = await slot.update({ path: files[1].path }, { props: { status: "done" } });
	check("the second write keeps the id the first minted", second.id, first.id);
	check("the survivor keeps the shared id", (await slot.get({ path: files[0].path })).id, "shared");
}

console.log("\na duplicate is re-minted even when nothing listed the folder first");
{
	const { app, files } = fakeTaskVault(FOLDER, 3, CACHE_STAYS_SILENT);
	for (const file of files) file.props.widgetarium = { wgId: "shared" };
	const slot = slotOver(app);

	const written = await slot.update({ path: files[2].path }, { props: { status: "done" } });
	claim(`re-minted with no list() before it → ${written.id}`, written.id !== "shared" && Boolean(written.id));
}

console.log("\na rename with no property patch still answers with the record it renamed");
{
	const { app, files } = fakeTaskVault(FOLDER, 3, CACHE_STAYS_SILENT);
	files[0].props.widgetarium = { wgId: "kept" };
	const slot = slotOver(app);
	await slot.list();

	const renamed = await slot.update({ path: files[0].path }, { name: "Renamed" });
	check("the id survives the rename", renamed.id, "kept");
	check("and so do the properties", renamed.props.title, "Task 0");
}

console.log(wrong === 0 ? "\nwrite record gate: clean" : `\nwrite record gate: ${wrong} wrong`);
process.exit(wrong === 0 ? 0 : 1);
