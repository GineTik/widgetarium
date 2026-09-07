import esbuild from "esbuild";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import nodePath from "node:path";
import vm from "node:vm";
import { transform } from "sucrase";
import { bundleOptions } from "../build.mjs";
import { NO_PLUGIN, TASK_NEEDS, catalogueAdapter, countingDisk, fakeTaskVault } from "./perf-fixture.mjs";

const { createHost } = await import("./.mjs-cache/host.mjs");
const { folderGateway } = await import("./.mjs-cache/gateway/obsidian.mjs");
const { mappedCollection } = await import("./.mjs-cache/gateway/mapped.mjs");
const { narrowed } = await import("./.mjs-cache/gateway/narrow.mjs");
const { gatewayCache } = await import("./.mjs-cache/gateway/cache.mjs");
const { createInstaller, INDEX_PATH } = await import("./.mjs-cache/installer.mjs");

const NOTES = Number(process.env.N ?? 200);
const WIDGET_SOURCE = process.env.WG_WIDGET_SOURCE ?? nodePath.resolve("widgets");
const MEATADATA_NEVER_ARRIVES_MS = 2000;
const VAULT = process.env.WG_VAULT ?? `${process.env.HOME}/Documents/Obsidian/Personal/Personal`;

const heading = (text) => console.log(`\n\x1b[1m${text}\x1b[0m`);
const row = (label, value) => console.log(`  ${label.padEnd(38)} ${value}`);
const settle = (ms) => new Promise((done) => setTimeout(done, ms));
const megabytes = (bytes) => `${(bytes / 1048576).toFixed(2)} MB`;
const isDevBuild = (source) => source.includes("//# sourceMappingURL=");

function onloadBody() {
	const startup = fs.readFileSync("src/main.js", "utf8");
	const opens = startup.indexOf("\n\tasync onload() {");
	const closes = startup.indexOf("\n\t}\n", opens);
	return startup.slice(opens, closes);
}

function parseCost(source, label) {
	const rounds = 12;
	let spent = 0;
	for (let round = 0; round < rounds; round += 1) {
		const started = performance.now();
		new vm.Script(source, { filename: `${label}-${round}.js` });
		spent += performance.now() - started;
	}
	return spent / rounds;
}

async function reportFreshBuilds() {
	const out = fs.mkdtempSync(nodePath.join(os.tmpdir(), "wg-perf-"));
	for (const [label, minify, sourcemap] of [["dev", false, "inline"], ["prod", true, false]]) {
		const at = nodePath.join(out, `${label}.js`);
		await esbuild.build({ ...bundleOptions({ outfile: at, minify, sourcemap }), logLevel: "silent" });
		const source = fs.readFileSync(at, "utf8");
		row(`${label} build`, `${megabytes(source.length)}   parse+compile ${parseCost(source, label).toFixed(0)} ms`);
	}
	fs.rmSync(out, { recursive: true, force: true });
}

function reportBuildsOnDisk() {
	const places = [["repo main.js", "main.js"], ["vault main.js", `${VAULT}/.obsidian/plugins/widgetarium/main.js`]];
	for (const [label, at] of places.filter(([, held]) => fs.existsSync(held))) {
		const source = fs.readFileSync(at, "utf8");
		row(label, `${megabytes(source.length)}, ${isDevBuild(source) ? "DEV — the vault pays for this every start" : "prod"}`);
	}
}

async function reportBundles() {
	heading("1 · bundle");
	await reportFreshBuilds();
	reportBuildsOnDisk();
}

function widgetSources(at, found = []) {
	for (const name of fs.readdirSync(at)) {
		const here = nodePath.join(at, name);
		if (fs.statSync(here).isDirectory()) widgetSources(here, found);
		else if (/(widget\.(tsx|ts|jsx|js)|lib\.js)$/.test(name)) found.push({ path: here, code: fs.readFileSync(here, "utf8") });
	}
	return found;
}

const compileWidget = ({ code, path: at }) =>
	transform(code, {
		transforms: /\.tsx?$/.test(at) ? ["typescript", "jsx", "imports"] : ["jsx", "imports"],
		jsxPragma: "h",
		jsxFragmentPragma: "Fragment",
		production: true,
		filePath: at,
	}).code;

function reportWidgetCompile() {
	heading("2 · widget compile at startup");
	const sources = widgetSources(WIDGET_SOURCE);
	compileWidget(sources[0]);
	const at = performance.now();
	for (const source of sources) compileWidget(source);
	const once = performance.now() - at;

	const compilesCatalogueAtStartup = onloadBody().includes("drawable");
	row("widget modules", `${sources.length}, ${(sources.reduce((sum, one) => sum + one.code.length, 0) / 1024).toFixed(0)} kB`);
	row("sucrase, one pass", `${once.toFixed(0)} ms`);
	row("passes on the startup path", compilesCatalogueAtStartup ? "2 — registry.load AND the catalogue" : "1 — the catalogue waits to be opened");
}

async function reportCatalogueWalk() {
	heading("3 · installer.available() over a folder source");
	const counters = { exists: 0, read: 0, folders: 0 };
	const installer = createInstaller({
		adapter: catalogueAdapter({ sources: [{ path: WIDGET_SOURCE }] }, INDEX_PATH),
		fetchJson: async () => null,
		fetchText: async () => "",
		disk: countingDisk(fsp, nodePath, counters),
	});
	const at = performance.now();
	const offered = await installer.available();
	row("offers found", offered.length);
	row("disk calls, awaited one by one", `${counters.exists + counters.read + counters.folders} (${counters.exists} exists, ${counters.read} read, ${counters.folders} folders)`);
	row("wall time, warm local disk", `${(performance.now() - at).toFixed(0)} ms`);
}

function readerOver(host, folderName, at) {
	const base = folderGateway({ host, path: folderName, baked: { sort: [{ prop: "order", dir: "asc" }] }, requested: ["list", "get", "update"] });
	const mapped = mappedCollection(base, { needs: TASK_NEEDS, chosen: {} });
	return at === 0 ? mapped : narrowed(mapped, { order: { gte: at } });
}

// TRADE-OFF: a folder name per round, because the gateway cache is one module-level singleton and a shared name would let an earlier round answer a later one
async function costOfOneMove(readerCount, metadataDelayMs) {
	const folderName = `Tasks-${readerCount}-${metadataDelayMs}`;
	const { app, files, counters, reset } = fakeTaskVault(folderName, NOTES, metadataDelayMs);
	const host = createHost(app, NO_PLUGIN);
	const readers = Array.from({ length: readerCount }, (_, at) => readerOver(host, folderName, at));
	const stops = readers.map((reader) => gatewayCache.subscribe(reader.list.meta, undefined, (input) => reader.list(input), () => {}));
	await settle(60);

	reset();
	const at = performance.now();
	await readers[0].update({ ref: files[0].path, data: { props: { status: "done" } } });
	const untilTheWidgetIsFreeAgain = performance.now() - at;
	await settle(metadataDelayMs + 120);
	for (const stop of stops) stop();
	return { ...counters, untilTheWidgetIsFreeAgain };
}

async function reportCardMove() {
	heading(`4 · one card move, ${NOTES} notes in the folder`);
	for (const readerCount of [1, 3, 5]) {
		const held = await costOfOneMove(readerCount, 20);
		row(`${readerCount} widget${readerCount > 1 ? "s" : ""} over the folder`, `${held.folderWalk} full folder walks, ${held.toRecord} records built`);
	}
	console.log("");
	for (const metadataDelayMs of [20, 150, MEATADATA_NEVER_ARRIVES_MS]) {
		const held = await costOfOneMove(1, metadataDelayMs);
		const label = metadataDelayMs === MEATADATA_NEVER_ARRIVES_MS ? "metadataCache never answers" : `metadataCache answers in ${metadataDelayMs} ms`;
		row(label, `await update() blocks the widget for ${held.untilTheWidgetIsFreeAgain.toFixed(0)} ms`);
	}
}

async function reportFirstPaint() {
	heading(`5 · what one widget pays before it can draw, ${NOTES} notes`);
	const folderName = "Paint";
	const { app, counters, reset } = fakeTaskVault(folderName, NOTES);
	const host = createHost(app, NO_PLUGIN);
	const base = folderGateway({ host, path: folderName, baked: {}, requested: ["list", "get", "update"] });
	const mapped = mappedCollection(base, { needs: TASK_NEEDS, chosen: {} });

	reset();
	let at = performance.now();
	await mapped.list();
	row("first list() through needs mapping", `${(performance.now() - at).toFixed(1)} ms, ${counters.folderWalk} walks, ${counters.toRecord} records`);

	reset();
	at = performance.now();
	await mapped.list();
	row("second list(), resolution remembered", `${(performance.now() - at).toFixed(1)} ms, ${counters.folderWalk} walks, ${counters.toRecord} records`);

	const rebuilt = mappedCollection(folderGateway({ host, path: folderName, baked: {}, requested: ["list"] }), { needs: TASK_NEEDS, chosen: {} });
	reset();
	at = performance.now();
	await rebuilt.list();
	row("a REBUILT gateway pays it again", `${(performance.now() - at).toFixed(1)} ms, ${counters.folderWalk} walks, ${counters.toRecord} records`);
}

async function reportEmojiTable() {
	heading("6 · emoji table");
	const source = fs.readFileSync("src/emoji-table.js", "utf8");
	const asScript = source.replace(/^export const/gm, "var");
	row("size", `${(source.length / 1024).toFixed(0)} kB`);
	row("parse + evaluate", `${parseCost(asScript, "emoji").toFixed(1)} ms`);
}

async function reportThisVaultsSources() {
	const live = `${VAULT}/.widgetarium/catalogue.json`;
	if (!fs.existsSync(live)) return;
	const installer = createInstaller({
		adapter: catalogueAdapter(JSON.parse(fs.readFileSync(live, "utf8")), INDEX_PATH),
		fetchJson: async () => null,
		fetchText: async () => "",
		disk: null,
	});
	const authored = await installer.folderSourcePaths();
	row("this vault", authored.length > 0 ? `polls, authoring from ${authored.join(", ")}` : "never polls");
}

async function reportPollGate() {
	heading("7 · does this vault poll the filesystem");
	const startup = fs.readFileSync("src/main.js", "utf8");
	const isGated = /isAuthoringWidgetsHere\(\)\) await this\.watchWidgetFolder\(\)/.test(startup);
	row("interval", `${Number(/WIDGET_POLL_MS = (\d+)/.exec(startup)?.[1] ?? 0)} ms`);
	row("gated on a folder catalogue source", isGated ? "yes — other vaults never poll" : "NO — every vault polls");
	await reportThisVaultsSources();
}

await reportBundles();
reportWidgetCompile();
await reportCatalogueWalk();
await reportCardMove();
await reportFirstPaint();
await reportEmojiTable();
await reportPollGate();
console.log();
process.exit(0);
