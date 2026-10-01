import type { App } from "obsidian";
import { NO_PLUGIN, fakeTaskVault, type TaskApp, type TaskFile } from "./perf-fixture.ts";
import { standIn } from "./stand-in.ts";
import type { FolderSlot } from "../apps/obsidian/src/folder-slot.js";

const { createHost } = await import("../apps/obsidian/src/host.js");

const FOLDER = "Tasks";
const CACHE_STAYS_SILENT = 100000;
const ICLOUD_FETCH_MS = 1700;
const PROMPT_MS = 100;

let wrong = 0;

function claim(label: string, held: boolean): void {
	if (!held) wrong += 1;
	console.log(`${held ? "OK " : "BAD"} ${label}`);
}

function check(label: string, held: unknown, wanted: unknown): void {
	const ok = JSON.stringify(held) === JSON.stringify(wanted);
	if (!ok) wrong += 1;
	console.log(`${ok ? "OK " : "BAD"} ${label} → ${JSON.stringify(held)}`);
}

const FOLDER_BINDING = { kind: "folder", path: FOLDER };

const slotOver = (app: TaskApp): FolderSlot =>
	createHost(standIn<App>(app, ["vault", "metadataCache", "fileManager", "workspace"], "app"), NO_PLUGIN).slot(
		FOLDER_BINDING,
	);

function fileAt(files: readonly TaskFile[], at: number): TaskFile {
	const file = files[at];
	if (!file) throw new Error(`the fake vault holds no file ${at}`);
	return file;
}

function updateOf(slot: FolderSlot): NonNullable<FolderSlot["update"]> {
	if (!slot.update) throw new Error("the folder slot cannot update");
	return slot.update;
}

console.log(`the note takes ${ICLOUD_FETCH_MS} ms to fetch, the way an evicted iCloud note does`);
{
	const { app, files } = fakeTaskVault(FOLDER, 6, CACHE_STAYS_SILENT, ICLOUD_FETCH_MS);
	const slot = slotOver(app);
	await slot.list();

	const at = performance.now();
	const moving = updateOf(slot)({ path: fileAt(files, 0).path }, { props: { status: "done" } });

	const board = await slot.list();
	const seenAfterMs = performance.now() - at;
	check(
		"the board already draws the card in its new column",
		board.rows.find((row) => row.path === fileAt(files, 0).path)?.props["status"],
		"done",
	);
	claim(`without waiting for the fetch → ${seenAfterMs.toFixed(0)} ms`, seenAfterMs < PROMPT_MS);

	const landed = await moving;
	check("and the write reports the same when it lands", landed?.props["status"], "done");
	check(
		"the board still agrees afterwards",
		(await slot.list()).rows.find((row) => row.path === fileAt(files, 0).path)?.props["status"],
		"done",
	);
}

console.log("\na write that fails puts the card back where it was");
{
	const { app, files } = fakeTaskVault(FOLDER, 6, CACHE_STAYS_SILENT, 50);
	app.fileManager.processFrontMatter = async () => {
		throw new Error("the vault refused the write");
	};
	const slot = slotOver(app);
	await slot.list();

	const refused = await updateOf(slot)({ path: fileAt(files, 0).path }, { props: { status: "done" } }).then(
		() => null,
		(failure: unknown) => failure,
	);
	claim(
		`update() reports the failure → ${refused instanceof Error ? refused.message : undefined}`,
		refused instanceof Error,
	);
	check(
		"and the board is back on the old value",
		(await slot.list()).rows.find((row) => row.path === fileAt(files, 0).path)?.props["status"],
		"todo",
	);
}

console.log(wrong === 0 ? "\nslow storage gate: clean" : `\nslow storage gate: ${wrong} wrong`);
process.exit(wrong === 0 ? 0 : 1);
