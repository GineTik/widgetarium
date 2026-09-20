// CONTEXT: jsdom lays nothing out and resolves no cascade, so every check here runs in real Chrome
import { THEMES } from "./host-themes.mjs";
import { TEXT_LOADERS } from "../build.mjs";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import esbuild from "esbuild";
import { buildMirror } from "./mirror.mjs";

buildMirror();
const { WIDGETS_DIR } = await import("./.mjs-cache/paths.mjs");

const CHROME = process.env.WG_CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const work = mkdtempSync(path.join(tmpdir(), "wg-paint-"));
const ROOT = process.cwd();

let failed = 0;
function check(name, got, want) {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`,
	);
}

function collect(from, into, prefix) {
	for (const name of readdirSync(from)) {
		const full = path.join(from, name);
		const key = `${prefix}/${name}`;
		if (statSync(full).isDirectory()) collect(full, into, key);
		else if (/\.(json|tsx|jsx|js|css)$/.test(name)) into[key] = readFileSync(full, "utf8");
	}
	return into;
}

const files = collect("widgets", {}, WIDGETS_DIR);

async function bundle(source) {
	const built = await esbuild.build({
		stdin: { contents: source, resolveDir: ROOT, loader: "jsx", sourcefile: "probe.jsx" },
		bundle: true,
		loader: TEXT_LOADERS,
		write: false,
		format: "iife",
		platform: "browser",
		target: "es2020",
		jsxFactory: "h",
		jsxFragment: "Fragment",
		inject: ["tools/fill-inject.js"],
		alias: {
			widgetarium: "./tools/fill-shim.js",
			"widgetarium/kit": "./src/kit.js",
			"widgetarium/kit/emojis": "./src/emojis.js",
			"@default/lib": "./widgets/@default/lib.js",
			obsidian: "./tools/obsidian-shim.js",
		},
		logLevel: "warning",
	});
	return built.outputFiles[0].text;
}

function pageFor(theme, script, name, sheets = []) {
	const page = `<!doctype html><html><head><meta charset="utf-8">
<style>${readFileSync("styles.css", "utf8")}</style>
<style>${sheets.map((at) => readFileSync(at, "utf8")).join("\n")}</style>
<style>body { margin: 0; ${THEMES[theme]}
	--font-interface: "Helvetica Neue", Helvetica, Arial, sans-serif;
	--font-text: "Helvetica Neue", Helvetica, Arial, sans-serif;
	--font-monospace: "SF Mono", Menlo, Consolas, monospace;
	font-family: var(--font-interface); background: var(--background-secondary); }</style>
</head><body class="wg-root"><div id="host"></div>
<script>window.__FILES__=${JSON.stringify(files)}; window.__err = ""; addEventListener("error", (e) => { window.__err += e.message + " @ " + e.lineno + ":" + e.colno + "\\n"; });</script>
<script>${script}</script></body></html>`;
	const file = path.join(work, `${name}-${theme}.html`);
	writeFileSync(file, page);
	return file;
}

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function openChrome(file, windowSize = "1280,900") {
	const port = 9300 + Math.floor(Math.random() * 500);
	const profile = mkdtempSync(path.join(tmpdir(), "wg-paint-profile-"));
	const chrome = spawn(
		CHROME,
		[
			"--headless=new",
			"--disable-gpu",
			"--no-sandbox",
			"--hide-scrollbars",
			`--window-size=${windowSize}`,
			`--remote-debugging-port=${port}`,
			`--user-data-dir=${profile}`,
			`file://${file}`,
		],
		{ stdio: ["ignore", "ignore", "ignore"] },
	);
	for (let attempt = 0; attempt < 100; attempt += 1) {
		try {
			const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
			const target = list.find((entry) => entry.type === "page" && entry.webSocketDebuggerUrl);
			if (target) return { chrome, socketUrl: target.webSocketDebuggerUrl };
		} catch {}
		await sleep(120);
	}
	chrome.kill();
	throw new Error("chrome never opened a page target");
}

async function ask(file, expression, settleMs, hover, windowSize) {
	const { chrome, socketUrl } = await openChrome(file, windowSize);
	const socket = new WebSocket(socketUrl);
	await new Promise((done, fail) => {
		socket.addEventListener("open", done, { once: true });
		socket.addEventListener("error", fail, { once: true });
	});
	const pending = new Map();
	let ticket = 0;
	socket.addEventListener("message", (event) => {
		const message = JSON.parse(event.data);
		pending.get(message.id)?.(message);
		pending.delete(message.id);
	});
	const send = (method, params) =>
		new Promise((done) => {
			const id = (ticket += 1);
			pending.set(id, done);
			socket.send(JSON.stringify({ id, method, params }));
		});
	await sleep(settleMs);
	// CONTEXT: :hover cannot be set from script — only a real pointer puts it on
	if (hover) {
		const found = await send("Runtime.evaluate", {
			expression: `(() => { const node = document.querySelector(${JSON.stringify(hover)}); if (!node) return null; const box = node.getBoundingClientRect(); return { x: box.left + box.width / 2, y: box.top + box.height / 2 }; })()`,
			returnByValue: true,
		});
		const at = found.result?.result?.value;
		if (!at) {
			socket.close();
			chrome.kill();
			throw new Error(`nothing to hover at ${hover}`);
		}
		await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: at.x, y: at.y, buttons: 0 });
		await sleep(420);
	}
	const reply = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
	let why = null;
	// CONTEXT: React reports a render failure as a window error event, so the page holds it, not the throw
	if (reply.result?.exceptionDetails) {
		const onPage = await send("Runtime.evaluate", { expression: "window.__err || ''", returnByValue: true });
		why =
			onPage.result?.result?.value ||
			JSON.stringify(reply.result.exceptionDetails.exception ?? reply.result.exceptionDetails);
	}
	socket.close();
	chrome.kill();
	if (why !== null) throw new Error(`the page threw: ${why}`);
	return reply.result.result.value;
}

// CONTEXT: Chrome resolves var() and calc() before this reads it, so these are the painted numbers
const ROW_SCRIPT = `
const host = document.getElementById("host");
host.innerHTML = '<div class="wg-kit-side-list" style="width:170px">'
  + '<div class="wg-kit-row is-pressable wg-kit-side-row wg-set-row">'
  + '<span class="wg-kit-row-label">Value</span>'
  + '<span class="wg-kit-row-value wg-kit-side-value">Editable tabs \\u00b7 Selected tab</span>'
  + '</div></div>';
`;

const ROW_ASK = `(() => {
	const label = document.querySelector(".wg-kit-row-label");
	const value = document.querySelector(".wg-kit-side-value");
	return {
		labelWidthPx: Math.round(label.getBoundingClientRect().width),
		labelSaid: label.textContent.trim(),
		valueClipped: value.scrollWidth > value.clientWidth + 1,
	};
})()`;

const CROWDED_POP_SCRIPT = `
const host = document.getElementById("host");
host.innerHTML = '<div class="wg-set-pop-body" style="width:264px;max-height:240px">'
  + '<div class="wg-set-pop-head"><span class="wg-set-pop-title">Source</span><span class="wg-set-pop-hint">The markdown to draw, typed here or bound to a note.</span></div>'
  + '<div class="wg-kit-seg is-s wg-set-pop-kind" role="tablist"><button aria-selected="true">Typed here</button><button>From a widget</button></div>'
  + '<textarea style="height:600px"></textarea>'
  + '</div>';
`;

const CROWDED_POP_ASK = `(() => {
	const body = document.querySelector(".wg-set-pop-body");
	const kind = document.querySelector(".wg-kit-seg");
	return {
		kindHeightPx: Math.round(kind.getBoundingClientRect().height),
		bodyScrolls: body.scrollHeight > body.clientHeight,
	};
})()`;

const SHADOW_READER = `
function shadowLayers(value) {
	if (!value || value === "none") return [];
	return value.split(/,(?![^(]*\\))/).map((layer) => {
		const lengths = [...layer.matchAll(/(-?[\\d.]+)px/g)].map((hit) => Number(hit[1]));
		return { inset: layer.includes("inset"), lengths };
	});
}
function sideReach(value) {
	return shadowLayers(value).filter((layer) => !layer.inset).reduce((widest, layer) => {
		const [offsetX = 0, offsetY = 0, blur = 0, spread = 0] = layer.lengths;
		return Math.max(widest, Math.abs(offsetX) + blur / 2 + spread);
	}, -Infinity);
}`;

const SUB_PROBE = `
import { createElement as h } from "react";
import { render } from "./src/engine/render.js";
import { useEffect, useState } from "react";
import { SubstitutionDialog } from "./src/substitution-dialog.js";
import { WidgetRegistry } from "./src/registry.js";
import { normalizeRules } from "./src/substitution.js";

const FILES = window.__FILES__;
const adapter = {
	async exists(path) {
		return Object.hasOwn(FILES, path) || Object.keys(FILES).some((key) => key.startsWith(path + "/"));
	},
	async list(path) {
		const files = [];
		const folders = new Set();
		for (const key of Object.keys(FILES)) {
			if (!key.startsWith(path + "/")) continue;
			const rest = key.slice(path.length + 1);
			const cut = rest.indexOf("/");
			if (cut === -1) files.push(key);
			else folders.add(path + "/" + rest.slice(0, cut));
		}
		return { files, folders: [...folders] };
	},
	async read(path) {
		return FILES[path];
	},
};
const START = normalizeRules([{ id: "sub-0", name: "Code", mode: "line", open: "!code", widget: "@default/code-block" }]);
function Harness() {
	const [registry, setRegistry] = useState(null);
	const [rules, setRules] = useState(START);
	useEffect(() => {
		const loading = new WidgetRegistry({ vault: { adapter } });
		loading.load().then(() => setRegistry(loading));
	}, []);
	if (!registry) return h("p", null, "Loading widgets");
	return h(SubstitutionDialog, { rules, registry, host: null, onChange: setRules, onClose: () => {} });
}
render(h(Harness), document.getElementById("host"));
`;

const KIT_PROBE = `
import { createElement as h } from "react";
import { render } from "./src/engine/render.js";
import { Button, Card, Icon, IconButton, List, PlaceholderMark, Row, markOf } from "./src/kit.js";
const MARK_SEED = "Kind of Blue";
const marked = (id, props) => h("div", { key: id, id }, h(PlaceholderMark, { seed: MARK_SEED, ...props }));
render(
	h("div", { style: { padding: "40px", display: "flex", flexDirection: "column", gap: "24px", alignItems: "flex-start" } }, [
		h("div", { key: "controls", style: { display: "flex", gap: "24px", alignItems: "center" } }, [
			h(Button, { key: "neutral", id: "neutral" }, "Delete"),
			h(Button, { key: "accent", id: "accent", variant: "accent" }, "Save"),
			h(Button, { key: "plain", id: "plain", variant: "plain" }, "Cancel"),
			h(Button, { key: "danger", id: "danger", variant: "danger" }, "Discard"),
			h(IconButton, { key: "icon", id: "icon" }, h(Icon, { name: "close" })),
			h(IconButton, { key: "glass", id: "glass", variant: "glass" }, h(Icon, { name: "close" })),
		]),
		h(List, { key: "list", style: { width: "320px" } }, [
			h(Row, { key: "row" }, [
				h("span", { key: "label", className: "wg-kit-row-label" }, "In a group"),
				h(Button, { key: "rowbutton", id: "row-button" }, "Open"),
				h(IconButton, { key: "rowicon", id: "row-icon" }, h(Icon, { name: "close" })),
			]),
		]),
		h(Card, { key: "plate", id: "plain-card", style: { width: "240px", height: "80px" } }, "A plain light card"),
		h(Card, { key: "lifted", id: "lifted-card", lift: true, style: { width: "240px", height: "80px" } }, "A lifted card"),
		h("div", { key: "raise", id: "raise-swatch", style: { width: "8px", height: "8px", background: "var(--wg-kit-raise)" } }),
		h("div", { key: "fill", id: "fill-swatch", style: { width: "8px", height: "8px", background: "var(--wg-kit-fill)" } }),
		h("div", { key: "hover", id: "hover-swatch", style: { width: "8px", height: "8px", background: "var(--wg-kit-fill-hover)" } }),
		h("div", { key: "marks", style: { display: "flex", gap: "24px", alignItems: "center" } }, [
			marked("mark-cover", { size: 240 }),
			marked("mark-avatar", { size: 24 }),
			marked("mark-named", { size: 48, shape: "ring", tone: "info" }),
		]),
		h("div", { key: "seededwash", id: "seeded-wash-swatch", style: { width: "8px", height: "8px", background: "var(--wg-kit-" + markOf(MARK_SEED).tone + "-wash)" } }),
		h("div", { key: "seededink", id: "seeded-ink-swatch", style: { width: "8px", height: "8px", color: "var(--wg-kit-" + markOf(MARK_SEED).tone + ")" } }),
		h("div", { key: "namedwash", id: "named-wash-swatch", style: { width: "8px", height: "8px", background: "var(--wg-kit-info-wash)" } }),
	]),
	document.getElementById("host"),
);
`;

const MOUNT_PROBE = `
import { createElement as h } from "react";
import { render } from "./src/engine/render.js";
import { WidgetSurface } from "./src/surface.js";
import { normalizeBoard } from "./src/model.js";

const GROUP_ID = "@default/view-group";
const KANBAN_ID = "@default/kanban-board";
const ARCHIVE_ID = "@default/archived-columns";
const INLINE_ID = "@default/reminder";
const shelf = {
	[GROUP_ID]: { id: GROUP_ID, title: "View group", mounts: { holds: { label: "Views" } } },
	[KANBAN_ID]: { id: KANBAN_ID, title: "Kanban board", defaultSize: { w: 6, h: 4 } },
	[ARCHIVE_ID]: { id: ARCHIVE_ID, title: "Archived columns", defaultSize: { w: 4, h: 3 } },
	[INLINE_ID]: { id: INLINE_ID, title: "Reminder", inline: true },
};
const Leaf = () => h("div", { className: "leaf" }, "leaf");
const registry = {
	get: (id) => (shelf[id] ? { manifest: shelf[id], component: Leaf } : null),
	list: () => Object.values(shelf).map((manifest) => ({ manifest, component: Leaf })),
};
const slot = { canCreate: true, canUpdate: true, canRemove: true, canSubscribe: false, list: async () => ({ rows: [], total: 0 }), describe: async () => [] };
const host = { platform: "probe", can: {}, slot: () => slot, ui: { notify() {}, openNote() {} } };
let board = normalizeBoard({
	tiles: [{ id: "t1", widget: GROUP_ID, settings: { holds: [{ name: "Kanban", widget: KANBAN_ID }] } }],
	layouts: { 20: [{ id: "t1", x: 0, y: 0, w: 12, h: 6 }] },
});
const node = document.getElementById("host");
function draw() {
	render(h(WidgetSurface, { board, boardNode: node, registry, host, editing: true, initialWidth: 1240, onChange: (next) => { board = next; draw(); } }), node);
}
draw();
const settle = () => new Promise((done) => requestAnimationFrame(() => setTimeout(done, 140)));
window.__PRESS__ = async (target) => {
	target?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
	await settle();
	await settle();
};
window.__ROWS__ = () => [...document.querySelectorAll(".wg-set-panel .wg-kit-row")];
`;

const SUB_ASK = `(() => {
	${SHADOW_READER}
	const list = document.querySelector(".wg-sub-list");
	const shadow = list ? getComputedStyle(list).boxShadow : "none";
	return {
		found: Boolean(list),
		insetLayers: shadowLayers(shadow).filter((layer) => layer.inset).length,
		layers: shadowLayers(shadow).length,
		reachesSideways: sideReach(shadow) > 0,
	};
})()`;

const KIT_ASK = `(() => {
	${SHADOW_READER}
	const edgeOf = (id) => {
		const painted = getComputedStyle(document.getElementById(id), "::before").boxShadow;
		const insets = shadowLayers(painted).filter((layer) => layer.inset);
		if (insets.length === 0) return null;
		const alpha = /\\/\\s*([\\d.]+)\\s*\\)/.exec(painted);
		return { edges: insets.length, widthPx: insets[0].lengths[3] ?? 0, inkAlpha: alpha ? Number(alpha[1]) : null };
	};
	const fillOf = (id) => getComputedStyle(document.getElementById(id), "::before").backgroundColor;
	const swatchOf = (id) => getComputedStyle(document.getElementById(id)).backgroundColor;
	const markAt = (id) => {
		const worn = document.querySelector("#" + id + " .wg-kit-mark");
		const form = worn.querySelector("svg").getBoundingClientRect();
		return {
			field: getComputedStyle(worn).backgroundColor,
			formInk: getComputedStyle(worn.querySelector("path")).fill,
			share: Math.round((form.width / worn.getBoundingClientRect().width) * 100),
			path: worn.querySelector("path").getAttribute("d"),
			hidden: worn.getAttribute("aria-hidden"),
		};
	};
	const ringOf = (id) => {
		const control = document.getElementById(id);
		control.focus();
		const layers = shadowLayers(getComputedStyle(control, "::before").boxShadow);
		control.blur();
		return { layers: layers.length, inset: layers[0]?.inset ?? null, spreadPx: layers[0]?.lengths[3] ?? null };
	};
	return {
		neutralButton: edgeOf("neutral"),
		neutralIcon: edgeOf("icon"),
		glassIcon: edgeOf("glass"),
		accentButton: edgeOf("accent"),
		dangerButton: edgeOf("danger"),
		plainButton: edgeOf("plain"),
		rowButton: edgeOf("row-button"),
		rowIcon: edgeOf("row-icon"),
		rowButtonIsRaised: fillOf("row-button") === swatchOf("raise-swatch"),
		neutralIsTheGreyFill: fillOf("neutral") === swatchOf("fill-swatch"),
		raisedIsNotTheGreyFill: swatchOf("raise-swatch") !== swatchOf("fill-swatch"),
		focusRing: ringOf("row-button"),
		plainCard: getComputedStyle(document.getElementById("plain-card")).boxShadow,
		liftedCardInsets: shadowLayers(getComputedStyle(document.getElementById("lifted-card")).boxShadow).filter((layer) => layer.inset).length,
		markField: markAt("mark-cover").field === swatchOf("seeded-wash-swatch"),
		markFieldIsPainted: markAt("mark-cover").field !== "rgba(0, 0, 0, 0)",
		markForm: markAt("mark-cover").formInk === getComputedStyle(document.getElementById("seeded-ink-swatch")).color,
		markNamedField: markAt("mark-named").field === swatchOf("named-wash-swatch"),
		markShare: ["mark-cover", "mark-avatar", "mark-named"].map((id) => markAt(id).share),
		markSameFormAtBothEnds: markAt("mark-cover").path === markAt("mark-avatar").path,
		markIsDecorative: markAt("mark-cover").hidden,
	};
})()`;

const KIT_HOVER_ASK = `(() => {
	${SHADOW_READER}
	const before = (id) => getComputedStyle(document.getElementById(id), "::before");
	const insetsOf = (id) => shadowLayers(before(id).boxShadow).filter((layer) => layer.inset).length;
	return {
		hoveredFill: before("row-button").backgroundColor,
		hoverFill: getComputedStyle(document.getElementById("hover-swatch")).backgroundColor,
		hoveredEdges: insetsOf("row-button"),
		restingEdges: insetsOf("row-icon"),
	};
})()`;

const MOUNT_ASK = `(async () => {
	await window.__PRESS__(document.querySelector('.wg-tile-actions button[aria-label="Settings"]'));
	const held = window.__ROWS__().find((row) => row.textContent.includes("Kanban"));
	const value = held.querySelector(".wg-kit-row-value");
	const boxes = [...value.querySelectorAll("button")].map((button) => button.getBoundingClientRect());
	const gaps = boxes.slice(1).map((box, at) => Math.round(box.left - boxes[at].right));
	await window.__PRESS__(window.__ROWS__().find((row) => row.textContent.includes("Add a view")));
	const dialog = document.querySelector(".wg-cat-dialog");
	const tiles = dialog ? [...dialog.querySelectorAll(".wg-cat-tile")] : [];
	const bareList = Boolean(document.querySelector(".wg-set-pop-name"));
	const pickable = (name) => {
		const tile = [...document.querySelectorAll(".wg-cat-tile")].find((node) => node.getAttribute("aria-label") === name);
		return tile ? tile.querySelector(".wg-cat-go") ?? tile : null;
	};
	await window.__PRESS__(pickable("Add Archived columns"));
	await window.__PRESS__(window.__ROWS__().find((row) => row.textContent.includes("Add a view")));
	await window.__PRESS__(pickable("Add Archived columns"));
	return {
		trailingCount: boxes.length,
		gaps,
		opened: Boolean(dialog),
		said: dialog ? [...dialog.querySelectorAll("h1,h2,h3,p")].map((node) => node.textContent.trim())[0] : null,
		offered: tiles.map((tile) => tile.querySelector(".wg-cat-name").textContent).sort(),
		everyCardDrawsTheWidget: tiles.length > 0 && tiles.every((tile) => Boolean(tile.querySelector(".wg-cat-pic"))),
		searchable: Boolean(dialog?.querySelector("input")),
		bareList,
		names: window.__ROWS__().map((row) => row.querySelector(".wg-kit-row-label")?.firstChild?.textContent ?? row.textContent.trim()),
	};
})()`;

const OVERLAY_PROBE = `
import { createElement as h, useEffect, useState } from "react";
import { render } from "./src/engine/render.js";
import { WidgetSurface } from "./src/surface.js";
import { WidgetRegistry } from "./src/registry.js";
import { normalizeBoard } from "./src/model.js";

const GROUP_ID = "@default/view-group";
const KANBAN_ID = "@default/kanban-board";
const FILES = window.__FILES__;
const adapter = {
	async exists(path) {
		return Object.hasOwn(FILES, path) || Object.keys(FILES).some((key) => key.startsWith(path + "/"));
	},
	async list(path) {
		const files = [];
		const folders = new Set();
		for (const key of Object.keys(FILES)) {
			if (!key.startsWith(path + "/")) continue;
			const rest = key.slice(path.length + 1);
			const cut = rest.indexOf("/");
			if (cut === -1) files.push(key);
			else folders.add(path + "/" + rest.slice(0, cut));
		}
		return { files, folders: [...folders] };
	},
	async read(path) {
		return FILES[path];
	},
};
const ROWS = ["To Do", "Doing"].flatMap((status, at) =>
	[1, 2].map((nth) => ({
		path: "Orbitask/Tasks/" + status + "-" + nth + ".md",
		ref: { path: "Orbitask/Tasks/" + status + "-" + nth + ".md" },
		name: status + " " + nth,
		props: { title: status + " " + nth, status, order: at * 2 + nth },
		meta: { created: 1, modified: 2 },
		attachments: 0,
	})),
);
const slot = {
	canCreate: false, canUpdate: false, canRemove: false, canSubscribe: false,
	list: async () => ({ rows: ROWS, total: ROWS.length }),
	describe: async () => [],
};
const host = { platform: "probe", can: {}, slot: () => slot, ui: { notify() {}, openNote() {} } };
let board = normalizeBoard({
	tiles: [
		{
			id: "t1",
			widget: GROUP_ID,
			mounts: { holds: [{ name: "Inner", widget: GROUP_ID }] },
			mounted: { Inner: { widget: GROUP_ID, mounts: { holds: [{ name: "Kanban", widget: KANBAN_ID }] } } },
		},
	],
	layout: { left: [], main: [[{ id: "t1", height: 560 }]], right: [] },
});
const node = document.getElementById("host");
function Harness() {
	const [registry, setRegistry] = useState(null);
	useEffect(() => {
		const loading = new WidgetRegistry({ vault: { adapter } });
		loading.load().then(() => setRegistry(loading));
	}, []);
	if (!registry) return h("p", null, "Loading widgets");
	return h(WidgetSurface, { board, boardNode: node, registry, host, editing: false, initialWidth: 1240, onChange: (next) => { board = next; draw(); } });
}
function draw() {
	render(h(Harness), node);
}
draw();
const settle = () => new Promise((done) => requestAnimationFrame(() => setTimeout(done, 160)));
window.__PRESS__ = async (target) => {
	target?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
	await settle();
	await settle();
};
`;

const OVERLAY_ASK = `(async () => {
	await window.__PRESS__(document.querySelector(".wg-mounted .ovg-strip .wg-tabs-more"));
	const overlay = document.querySelector("[data-wg-overlay]");
	const roots = [...document.querySelectorAll(".wg-widget-root")];
	const overflowOf = (node) => getComputedStyle(node).overflowY;
	const body = document.querySelector(".wg-tree-cell > .wg-tile-body");
	const seamed = body?.querySelector(":scope > .wg-drawn > .wg-drawn > .wg-widget-root");
	const boxOf = (node) => (node ? [Math.round(node.getBoundingClientRect().width), Math.round(node.getBoundingClientRect().height)] : null);
	return {
		seamDisplay: [...new Set([...document.querySelectorAll(".wg-drawn")].map((node) => getComputedStyle(node).display))],
		tallEnoughToJudge: (boxOf(body)?.[1] ?? 0) > 100,
		tileBox: boxOf(body),
		widgetBox: boxOf(seamed),
		opened: Boolean(overlay),
		insideAMountedChild: Boolean(document.querySelector(".wg-mounted [data-wg-overlay]")),
		holding: [...new Set(roots.filter((root) => overlay && root.contains(overlay)).map(overflowOf))],
		holdingCount: roots.filter((root) => overlay && root.contains(overlay)).length,
		beside: [...new Set(roots.filter((root) => !overlay || !root.contains(overlay)).map(overflowOf))],
		besideCount: roots.filter((root) => !overlay || !root.contains(overlay)).length,
	};
})()`;

const STREAK_RAIL_PX = 836;
const STREAK_SLACK_PX = 830;
const STREAK_TILE_PX = 120;
const STREAK_HEIGHT_PX = JSON.parse(readFileSync("widgets/@default/streak/manifest.generated.json", "utf8")).size
	.tallestPx;
const STREAK_NATURAL_PX = 84;

const STREAK_PROBE = `
import { createElement as h } from "react";
import { render } from "./src/engine/render.js";
import Widget from "./widgets/@default/streak/widget.tsx";
import { collectionGateway, soloGateway } from "./src/gateway/create";

const kept = ["2026-08-31", "2026-09-01", "2026-09-02"];
const rows = kept.map((day) => ({ ref: "Habits/" + day + ".md", value: { name: day, done: 1, date: day } }));
const days = collectionGateway({
	id: "paint/streak",
	handlers: { list: () => ({ rows, total: rows.length }), get: (ref) => rows.find((row) => row.ref === ref) ?? null },
});

const host = document.getElementById("host");
const tile = document.createElement("div");
tile.className = "wg-tile-body";
tile.style.width = "${STREAK_RAIL_PX}px";
tile.style.height = "${STREAK_TILE_PX}px";
tile.style.display = "grid";
host.appendChild(tile);
render(
	h(Widget, {
		days,
		title: soloGateway("Meditation", {}, "paint/streak/title"),
		emoji: soloGateway("smiling-face-with-halo", {}, "paint/streak/emoji"),
	}),
	tile,
);
`;

const STREAK_ASK = `(async () => {
	const settle = (ms) => new Promise((done) => setTimeout(done, ms));
	const tile = document.querySelector(".wg-tile-body");
	const measure = () => {
		const rail = document.querySelector(".hs-rail");
		const columns = [...document.querySelectorAll(".hs-day")];
		const edges = [...document.querySelectorAll(".hs-edge")];
		const railBox = rail.getBoundingClientRect();
		const widths = columns.map((column) => column.getBoundingClientRect().width);
		const paintedPx = [...edges, ...columns].reduce((total, node) => total + node.getBoundingClientRect().width, 0);
		return {
			railWidthPx: Math.round(railBox.width),
			columns: columns.length,
			widestColumnPx: Math.max(...widths),
			narrowestColumnPx: Math.min(...widths),
			unpaintedPx: Math.round(railBox.width - paintedPx),
			firstColumnStartsAtPx: Math.round(columns[0].getBoundingClientRect().left - railBox.left),
			lastColumnEndsAtPx: Math.round(railBox.right - columns[columns.length - 1].getBoundingClientRect().right),
		};
	};
	const tight = measure();
	tile.style.width = "${STREAK_SLACK_PX}px";
	await settle(600);
	const slack = measure();
	const round = (value) => Math.round(value * 10) / 10;
	const tileBox = document.querySelector(".habit-streak").getBoundingClientRect();
	const titleBox = document.querySelector(".hs-top").getBoundingClientRect();
	const railBox = document.querySelector(".hs-rail").getBoundingClientRect();
	const rings = [...document.querySelectorAll(".hs-ring")];
	const firstRing = rings[0].getBoundingClientRect();
	const lastRing = rings[rings.length - 1].getBoundingClientRect();
	tile.style.height = "auto";
	await settle(80);
	const naturalPx = Math.round(document.querySelector(".habit-streak").getBoundingClientRect().height);
	return {
		naturalPx,
		tight,
		slack,
		titleSaid: document.querySelector(".hs-title span").textContent,
		emojiDrawn: Boolean(document.querySelector(".hs-title .wg-kit-emoji path")),
		titleAboveRail: titleBox.bottom <= railBox.top,
		tilePx: Math.round(tileBox.height),
		abovePx: round(titleBox.top - tileBox.top),
		betweenPx: round(railBox.top - titleBox.bottom),
		belowPx: round(tileBox.bottom - railBox.bottom),
		titleStartsAtPx: round(document.querySelector(".hs-title").getBoundingClientRect().left - tileBox.left),
		firstRingStartsAtPx: round(firstRing.left - tileBox.left),
		countEndsAtPx: round(tileBox.right - document.querySelector(".hs-count").getBoundingClientRect().right),
		lastRingEndsAtPx: round(tileBox.right - lastRing.right),
	};
})()`;

const RAIL_CONTRAST_FLOOR = 4.5;
const RANK_SHEETS = ["widgets/@default/tokens.css", "widgets/@default/tier-list/widget.css"];

const RANK_PROBE = `
import { createElement as h } from "react";
import { render } from "./src/engine/render.js";
import Widget from "./widgets/@default/tier-list/widget.tsx";
import { TONE_NAMES } from "./src/kit.js";
import { collectionGateway, soloGateway } from "./src/gateway/create";

const tierRows = TONE_NAMES.map((tone, at) => ({ ref: "t" + at, value: { label: tone, tone, order: at + 1 } }));
const cardRows = TONE_NAMES.map((tone, at) => ({ ref: "c" + at, value: { name: "Card " + at, tier: tone, order: at + 1 } }));
const listing = (rows, id) => collectionGateway({
	id,
	settlesNow: true,
	handlers: { list: () => ({ rows, total: rows.length }), get: (ref) => rows.find((row) => row.ref === ref) ?? null },
});

const host = document.getElementById("host");
const tile = document.createElement("div");
tile.className = "wg-tile-body";
tile.style.width = "560px";
tile.style.height = "420px";
tile.style.display = "grid";
host.appendChild(tile);
render(
	h(Widget, {
		tiers: listing(tierRows, "paint/rank/tiers"),
		cards: listing(cardRows, "paint/rank/cards"),
		title: soloGateway("Tones", {}, "paint/rank/title"),
		cardSize: soloGateway(48, {}, "paint/rank/size"),
	}),
	tile,
);
`;

const RANK_ASK = `(async () => {
	await new Promise((done) => setTimeout(done, 120));
	const channel = (part) => (part <= 0.03928 ? part / 12.92 : Math.pow((part + 0.055) / 1.055, 2.4));
	const unitsOf = (painted) => {
		const parts = (painted.match(/[\\d.]+/g) ?? []).map(Number).slice(0, 3);
		return painted.startsWith("color(") ? parts : parts.map((held) => held / 255);
	};
	const luminance = (painted) => {
		const [red, green, blue] = unitsOf(painted).map(channel);
		return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
	};
	const contrast = (one, other) => {
		const first = luminance(one);
		const second = luminance(other);
		return Math.round(((Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)) * 100) / 100;
	};
	const rails = [...document.querySelectorAll(".wr-rail")].map((rail) => {
		const painted = getComputedStyle(rail);
		const label = getComputedStyle(rail.querySelector(".wr-rail-label"));
		return { tone: rail.querySelector(".wr-rail-label").textContent, ratio: contrast(painted.backgroundColor, label.color), fill: painted.backgroundColor };
	});
	const rack = document.querySelector(".wr-rack");
	const fog = document.querySelector(".wr-fog");
	const topNow = () => Number(getComputedStyle(fog).getPropertyValue("--wr-fog-top"));
	const bottomNow = () => Number(getComputedStyle(fog).getPropertyValue("--wr-fog-bottom"));
	const atRest = { top: topNow(), bottom: bottomNow(), scrollTop: rack.scrollTop };
	rack.scrollTop = 200;
	rack.dispatchEvent(new Event("scroll"));
	await new Promise((done) => setTimeout(done, 60));
	return {
		rails,
		distinctFills: new Set(rails.map((rail) => rail.fill)).size,
		atRest,
		fogAtRest: atRest.top,
		fogUnderTheTray: atRest.bottom,
		fogScrolled: topNow(),
		scrolls: rack.scrollHeight > rack.clientHeight,
		trayBelowRack: document.querySelector(".wr-tray").getBoundingClientRect().top >= rack.getBoundingClientRect().bottom - 1,
	};
})()`;

const CATALOGUE_PROBE = `
import { createElement as h } from "react";
import { render } from "./src/engine/render.js";
import { CatalogueDialog } from "./src/catalogue-dialog.js";

const definition = {
	manifest: { id: "@demo/clock", title: "Clock", defaultSize: { w: 3, h: 2 }, keywords: ["clock", "time", "hours", "zone", "tick", "watch", "dial", "alarm"], description: "A clock." },
	component: () => h("div", { className: "probe-inside", contentEditable: "true" }, "type here"),
};
const registry = { list: () => [definition], get: () => definition };

render(
	h(CatalogueDialog, {
		registry,
		host: null,
		mode: "browse",
		available: [],
		onPick: () => {},
		onInstall: async () => ({ ok: true }),
		onClose: () => {},
	}),
	document.getElementById("host"),
);
`;

const GUTTER_ASK = `(async () => {
	const frame = () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
	const side = document.querySelector(".wg-cat-side");
	const search = document.querySelector(".wg-cat-side .wg-cat-search");
	const facet = document.querySelector(".wg-cat-facet-search");
	const packs = document.querySelector(".wg-cat-packs");
	const tags = document.querySelector(".wg-cat-tags");
	const row = document.querySelector(".wg-cat-tag-row");
	const count = document.querySelector(".wg-cat-more-tags");
	const sideBox = side.getBoundingClientRect();
	const searchBox = search.getBoundingClientRect();
	const gutters = [Math.round(searchBox.left - sideBox.left), Math.round(sideBox.right - searchBox.right)];
	const alignment = Math.round(facet.getBoundingClientRect().left - packs.getBoundingClientRect().left);
	const tagsHtml = tags.outerHTML.slice(0, 180);
	const tagsAreOneRow = Math.round(tags.getBoundingClientRect().height);
	const tagRowScrolls = getComputedStyle(row).overflowX;
	const countIsPressable = count ? count.tagName : null;
	document.querySelector(".wg-cat-open-docs").click();
	await frame();
	const next = document.querySelector(".wg-doc-next");
	const padding = next ? getComputedStyle(next) : null;
	return {
		gutters,
		alignment,
		tagsHtml,
		tagsAreOneRow,
		tagRowScrolls,
		countIsPressable,
		nextPadding: padding ? [padding.paddingTop, padding.paddingBottom].join("/") : null,
		nextIsTallEnough: next ? Math.round(next.getBoundingClientRect().height) >= 64 : null,
	};
})()`;

const CATALOGUE_ASK = `(() => {
	const dialog = document.querySelector(".wg-cat-dialog");
	const box = dialog.getBoundingClientRect();
	const pic = document.querySelector(".wg-cat-pic");
	const inside = document.querySelector(".probe-inside");
	const sheet = document.querySelector(".wg-cat-sheet");
	const grip = document.querySelector(".wg-cat-sheet .wg-kit-sheet-grip");
	const at = inside?.getBoundingClientRect();
	return {
		viewport: [innerWidth, innerHeight],
		dialog: [Math.round(box.width), Math.round(box.height)],
		corner: getComputedStyle(dialog).borderTopLeftRadius,
		inert: getComputedStyle(pic).pointerEvents,
		hitsTheWidget: at ? document.elementFromPoint(at.left + at.width / 2, at.top + at.height / 2)?.closest(".probe-inside") !== null : null,
		takesTheCaret: (() => {
			inside?.focus();
			return document.activeElement === inside;
		})(),
		sidebars: document.querySelectorAll(".wg-cat-side").length,
		sheetFromBottomPx: sheet ? Math.round(innerHeight - sheet.getBoundingClientRect().bottom) : null,
		sheetWidthPx: sheet ? Math.round(sheet.getBoundingClientRect().width) : null,
		gripPaintsAHandle: grip ? getComputedStyle(grip, "::before").width : null,
		gripWearsABox: grip ? [getComputedStyle(grip).boxShadow, getComputedStyle(grip).backgroundColor].join(" ") : null,
	};
})()`;

const METRIC_SHEETS = ["widgets/@default/tokens.css", "widgets/@default/metric-total/widget.css"];

const METRIC_PROBE = `
import { createElement as h } from "react";
import { render } from "./src/engine/render.js";
import Widget from "./widgets/@default/metric-total/widget.tsx";
import { collectionGateway, soloGateway } from "./src/gateway/create";

const recordRows = [
	{ ref: "r0", value: { path: "Metrics/a.md", name: "a", date: "2026-09-10", amount: 120 } },
	{ ref: "r1", value: { path: "Metrics/b.md", name: "b", date: "2026-09-11", amount: 180 } },
];
const periodRows = [{ ref: "p7", value: { label: "Past 7 days", days: 7 } }];
const listing = (rows, id) => collectionGateway({
	id,
	settlesNow: true,
	handlers: {
		list: () => ({ rows, total: rows.length }),
		get: (ref) => rows.find((row) => row.ref === ref) ?? null,
		create: () => null,
		remove: () => undefined,
	},
});

const host = document.getElementById("host");
const tile = document.createElement("div");
tile.className = "wg-tile-body";
tile.style.width = "700px";
tile.style.height = "420px";
tile.style.display = "grid";
host.appendChild(tile);
render(
	h(Widget, {
		records: listing(recordRows, "paint/metric/records"),
		title: soloGateway("Total orders", {}, "paint/metric/title"),
		unit: soloGateway("orders", {}, "paint/metric/unit"),
		rising: soloGateway("good", {}, "paint/metric/rising"),
		periods: listing(periodRows, "paint/metric/periods"),
		periodPick: soloGateway("Past 7 days", {}, "paint/metric/pick"),
		period: soloGateway({ label: "Past 7 days", days: 7 }, {}, "paint/metric/period"),
		view: soloGateway("curve", {}, "paint/metric/view"),
	}),
	tile,
);
setTimeout(() => document.querySelector(".mt-foot .wg-kit-btn")?.click(), 200);
`;

const METRIC_HOVER_ASK = `(() => {
	const note = document.querySelector(".mt-note");
	const painted = getComputedStyle(note);
	return { fill: painted.backgroundColor, edge: painted.boxShadow, rested: getComputedStyle(document.querySelector(".mt-form-side .wg-kit-field")).backgroundColor };
})()`;

const METRIC_ASK = `(async () => {
	const settle = () => new Promise((done) => setTimeout(done, 140));
	const dialog = document.querySelector(".wg-dialog");
	const note = document.querySelector(".mt-note");
	const amount = document.querySelector(".mt-amount .wg-kit-field-input");
	const signs = [...document.querySelectorAll(".mt-sign .wg-kit-seg button")].map((button) => button.textContent.trim());

	const typed = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
	typed.call(amount, "7");
	amount.dispatchEvent(new Event("input", { bubbles: true }));
	await settle();

	return {
		periodInk: getComputedStyle(document.querySelector(".mt-period")).color,
		mutedInk: getComputedStyle(document.querySelector(".mt-title")).color,
		accentInk: getComputedStyle(document.documentElement).getPropertyValue("--interactive-accent").trim(),
		platesAcross: document.querySelectorAll(".mt-plate").length,
		platesDrawn: [...document.querySelectorAll(".mt-plate")].filter((plate) => getComputedStyle(plate).display !== "none").length,
		dialogCorner: dialog ? getComputedStyle(dialog).borderTopLeftRadius : null,
		dialogFill: dialog ? getComputedStyle(dialog).backgroundColor : null,
		noteTag: note ? note.tagName : null,
		noteTallerThanAField: note ? Math.round(note.getBoundingClientRect().height) : 0,
		signs,
		amountReadsBack: amount.value,
		unitBesideTheAmount: document.querySelector(".mt-form-side .wg-kit-field-unit") !== null,
	};
})()`;

const DRAWER_SCRIPT = `document.getElementById("host").innerHTML =
	'<div class="wg-drawer-over is-open">' +
	'<div class="wg-drawer-scrim"></div>' +
	'<div class="wg-drawer is-left" style="--wg-drawer-width: 280px"><div class="wg-tree-region is-left"></div></div>' +
	'</div><div id="raised" style="background: var(--wg-kit-raise)"></div>';`;

const DRAWER_ASK = `(() => {
	const over = document.querySelector(".wg-drawer-over");
	const panel = document.querySelector(".wg-drawer");
	const overBox = over.getBoundingClientRect();
	const panelBox = panel.getBoundingClientRect();
	const painted = getComputedStyle(panel);
	return {
		lies: getComputedStyle(over).position,
		coversTheWindow: [Math.round(overBox.width) === window.innerWidth, Math.round(overBox.height) === window.innerHeight],
		fromTopToBottom: [Math.round(panelBox.top), Math.round(window.innerHeight - panelBox.bottom)],
		widthPx: Math.round(panelBox.width),
		outerCorner: painted.borderTopLeftRadius,
		innerCorner: painted.borderTopRightRadius,
		scrimInk: getComputedStyle(document.querySelector(".wg-drawer-scrim")).backgroundColor,
		fillIsTheRaisedOne: painted.backgroundColor === getComputedStyle(document.getElementById("raised")).backgroundColor,
	};
})()`;

const [subScript, kitScript, mountScript, overlayScript, streakScript, rankScript, metricScript, catalogueScript] =
	await Promise.all([
		bundle(SUB_PROBE),
		bundle(KIT_PROBE),
		bundle(MOUNT_PROBE),
		bundle(OVERLAY_PROBE),
		bundle(STREAK_PROBE),
		bundle(RANK_PROBE),
		bundle(METRIC_PROBE),
		bundle(CATALOGUE_PROBE),
	]);

for (const theme of ["light", "dark"]) {
	console.log(`\n— ${theme} —`);

	const side = await ask(pageFor(theme, subScript, "sub"), SUB_ASK, 3000);
	check("the substitutions sidebar is drawn at all", side.found, true);
	check("and carries no inset edge", side.insetLayers, 0);
	check("its cast is the kit lift, both layers", side.layers, 2);
	check("and that cast paints beside the block, as every sidebar's does", side.reachesSideways, true);

	const drawer = await ask(pageFor(theme, DRAWER_SCRIPT, "drawer"), DRAWER_ASK, 600);
	check("a drawer lies over the app, not inside the note", drawer.lies, "fixed");
	check("and it covers the whole window", drawer.coversTheWindow, [true, true]);
	check("its panel runs from the top of the screen to the bottom", drawer.fromTopToBottom, [0, 0]);
	check("at the width the region carries", drawer.widthPx, 280);
	check("the corner against the screen edge is square", drawer.outerCorner, "0px");
	check("and only the one facing the board is round", drawer.innerCorner, "16px");
	check("the scrim separates without blacking the room out", drawer.scrimInk, "rgba(0, 0, 0, 0.22)");
	check("the panel is the raised surface, not a colour of its own", drawer.fillIsTheRaisedOne, true);

	const kit = await ask(pageFor(theme, kitScript, "kit"), KIT_ASK, 1200);
	check("a raised control carries a hairline on the ::before that owns its corner", kit.rowButton, {
		edges: 1,
		widthPx: 1,
		inkAlpha: 0.09,
	});

	const hovered = await ask(pageFor(theme, kitScript, "kit"), KIT_HOVER_ASK, 1200, "#row-button");
	check("the pointer turns a raised control's fill grey", hovered.hoveredFill, hovered.hoverFill);
	check("and the hairline goes with it, because a grey control has no edge", hovered.hoveredEdges, 0);
	check("while the control beside it, untouched, keeps its own", hovered.restingEdges, 1);
	check("so does a raised icon button", kit.rowIcon, { edges: 1, widthPx: 1, inkAlpha: 0.09 });
	check("and the control that carries it is the RAISED one, not a colour we guessed", kit.rowButtonIsRaised, true);
	check("a grey neutral button has none", kit.neutralButton, null);
	check("nor has a grey neutral icon button", kit.neutralIcon, null);
	check(
		"and that grey is the kit fill, a step away from the raised one",
		[kit.neutralIsTheGreyFill, kit.raisedIsNotTheGreyFill],
		[true, true],
	);
	check("an accent button has none, because its fill already says control", kit.accentButton, null);
	check("nor has a danger one", kit.dangerButton, null);
	check("nor has a plain one", kit.plainButton, null);
	check("glass keeps its own edge, undoubled", kit.glassIcon, { edges: 1, widthPx: 1, inkAlpha: 0.12 });
	check("the focus ring outranks the edge it lands on", kit.focusRing, { layers: 1, inset: false, spreadPx: 2 });
	check("a plain light card is still edgeless", kit.plainCard, "none");
	check("and only a lifted card draws one", kit.liftedCardInsets, 1);

	check("a seeded mark stands on a field, not on nothing", kit.markFieldIsPainted, true);
	check("and that field is the wash its seeded tone names", kit.markField, true);
	check("its form is inked by the same tone", kit.markForm, true);
	check("a tone asked for by name is painted too", kit.markNamedField, true);
	check("the form is the same share of the box at a cover, an avatar and between", kit.markShare, [56, 56, 56]);
	check("and it is the same form at both ends, not a second drawing", kit.markSameFormAtBothEnds, true);
	check("the mark says nothing to a screen reader", kit.markIsDecorative, "true");

	const crowded = await ask(pageFor(theme, CROWDED_POP_SCRIPT, "crowded-pop"), CROWDED_POP_ASK, 1200);
	check("a tall field under the kind switch leaves the switch its own height", crowded.kindHeightPx, 28);
	check("the popover scrolls instead of squeezing what it holds", crowded.bodyScrolls, true);

	const row = await ask(pageFor(theme, ROW_SCRIPT, "row"), ROW_ASK, 1200);
	check("a long value never squeezes the label off its own row", row.labelWidthPx > 0, true);
	check("the label is read whole, not clipped to nothing", row.labelSaid, "Value");
	check("the value gives way instead, and says so with an ellipsis", row.valueClipped, true);

	const mount = await ask(pageFor(theme, mountScript, "mount"), MOUNT_ASK, 2500);
	check("a mount row ends in two controls", mount.trailingCount, 2);
	check("spaced the way the kit spaces adjacent controls", mount.gaps, [8]);
	check("adding a view opens the catalogue", mount.opened, true);
	check("which says what the press means", mount.said, "Add a view");
	check("it offers the widgets that can stand on their own", mount.offered, [
		"Archived columns",
		"Kanban board",
		"View group",
	]);
	check("drawing each as the widget it is", mount.everyCardDrawsTheWidget, true);
	check("and it can be searched", mount.searchable, true);
	check("no bare list of titles is left anywhere", mount.bareList, false);
	check("a pick lands under its declared name, disambiguated", mount.names, [
		"Kanban",
		"Archived columns",
		"Archived columns 2",
		"Add a view",
	]);

	const overlay = await ask(pageFor(theme, overlayScript, "overlay"), OVERLAY_ASK, 3000);
	check("the element a tile is drawn into takes no box of its own", overlay.seamDisplay, ["contents"]);
	check(
		"so the widget still fills the tile it stands in",
		[overlay.widgetBox, overlay.tallEnoughToJudge],
		[overlay.tileBox, true],
	);
	check(
		"a panel opened inside a mounted child is an overlay the board can see",
		[overlay.opened, overlay.insideAMountedChild],
		[true, true],
	);
	check(
		"every widget root that holds it stops clipping",
		[overlay.holding, overlay.holdingCount > 1],
		[["visible"], true],
	);
	check(
		"while every root beside it keeps the clip the grid depends on",
		[overlay.beside, overlay.besideCount > 0],
		[["hidden"], true],
	);

	const streak = await ask(pageFor(theme, streakScript, "streak"), STREAK_ASK, 2000);
	check("the streak rail takes the whole tile", streak.tight.railWidthPx, STREAK_RAIL_PX);
	check("and leaves no unpainted slack across it", [streak.tight.unpaintedPx, streak.slack.unpaintedPx], [0, 0]);
	check("the days start one connector in, not on a centring margin", streak.tight.firstColumnStartsAtPx, 12);
	check("and end one connector from the far side", streak.tight.lastColumnEndsAtPx, 12);
	check(
		"every column is the width of the next",
		streak.tight.widestColumnPx - streak.tight.narrowestColumnPx < 1,
		true,
	);
	check("a width that fitted eighteen days before now fits nineteen", streak.tight.columns, 19);
	check("no column is squeezed under the ring it holds", streak.tight.narrowestColumnPx >= 36, true);
	check(
		"where a day is left over, the columns take the room instead of a margin",
		streak.slack.widestColumnPx > 44,
		true,
	);
	check(
		"and they still fill the rail exactly",
		[streak.slack.columns, streak.slack.railWidthPx],
		[18, STREAK_SLACK_PX],
	);
	check("the habit is named over the rail", [streak.titleSaid, streak.titleAboveRail], ["Meditation", true]);
	check("the streak draws itself in one fixed height", streak.naturalPx, STREAK_NATURAL_PX);
	check("and the tile it pins itself to has room for that", STREAK_HEIGHT_PX >= streak.naturalPx, true);
	check("beside a drawn emoji, not a typed one", streak.emojiDrawn, true);
	console.log(
		`    gaps above/between/below: ${streak.abovePx} / ${streak.betweenPx} / ${streak.belowPx} in a ${streak.tilePx}px tile; name at ${streak.titleStartsAtPx} vs ring at ${streak.firstRingStartsAtPx}; count at ${streak.countEndsAtPx} vs ring at ${streak.lastRingEndsAtPx}`,
	);
	check("the tile is drawn at its own two-cell height", streak.tilePx, 120);
	check(
		"the row above the rail is spaced as evenly as the rail is below it",
		[streak.abovePx, streak.betweenPx],
		[streak.belowPx, streak.belowPx],
	);
	check(
		"the name starts where the first ring starts",
		Math.abs(streak.titleStartsAtPx - streak.firstRingStartsAtPx) <= 0.5,
		true,
	);
	check(
		"and the run count ends where the last ring ends",
		Math.abs(streak.countEndsAtPx - streak.lastRingEndsAtPx) <= 0.5,
		true,
	);

	const rank = await ask(pageFor(theme, rankScript, "rank", RANK_SHEETS), RANK_ASK, 2000);
	console.log(`    rails: ${rank.rails.map((rail) => `${rail.tone} ${rail.ratio}`).join(", ")}`);
	console.log(`    fog at rest: ${JSON.stringify(rank.atRest)}`);
	check(
		"every tone paints a rail its own letter can be read on",
		rank.rails.filter((rail) => rail.ratio < RAIL_CONTRAST_FLOOR),
		[],
	);
	check("and all eight are told apart by colour", [rank.rails.length, rank.distinctFills], [8, 8]);
	check("a rack with more rows than room scrolls inside the tile", rank.scrolls, true);
	check("its fog is off while nothing has scrolled past", rank.fogAtRest, 0);
	check("and comes in once something has", rank.fogScrolled, 1);
	check("the other end is already in, because there is more below", rank.fogUnderTheTray, 1);
	check("the tray stays under the rack rather than scrolling away with it", rank.trayBelowRack, true);

	const metric = await ask(pageFor(theme, metricScript, "metric", METRIC_SHEETS), METRIC_ASK, 2000);
	console.log(
		`    add window: corner ${metric.dialogCorner}, note <${metric.noteTag}> ${metric.noteTallerThanAField}px, signs ${metric.signs.join("/")}`,
	);
	check(
		"the add window stands on the dialog's own corner, not the widget's square one",
		metric.dialogCorner !== "0px",
		true,
	);
	check(
		"the note is a text area a sentence fits in, not a one-line field",
		[metric.noteTag, metric.noteTallerThanAField > 60],
		["TEXTAREA", true],
	);
	check("the sign is the two-way toggle the design asked for", metric.signs, ["Add", "Subtract"]);
	check("nothing is written beside the amount", metric.unitBesideTheAmount, false);
	check("typing a number into the amount reads back as that number", metric.amountReadsBack, "7");
	console.log(`    period ink ${metric.periodInk}, plates ${metric.platesDrawn} of ${metric.platesAcross}`);
	check(
		"the period is not painted the accent the kit's plain button hands it",
		metric.periodInk === metric.accentInk,
		false,
	);

	const hoveredNote = await ask(
		pageFor(theme, metricScript, "metric", METRIC_SHEETS),
		METRIC_HOVER_ASK,
		2000,
		".mt-note",
	);
	console.log(`    note under the pointer: ${hoveredNote.fill}, edge ${hoveredNote.edge}`);
	check("a pointer over the note does not repaint it the host's way", hoveredNote.fill, hoveredNote.rested);
	check("and draws it no edge of its own", hoveredNote.edge, "none");

	const wide = await ask(pageFor(theme, catalogueScript, "catalogue"), CATALOGUE_ASK, 1500);
	check("on a window with room the catalogue is a dialog, not the screen", wide.dialog[1] < wide.viewport[1], true);
	check("and it stands on its own corner", wide.corner, "16px");
	check("its filters are a column beside the cards", wide.sidebars, 1);
	check("with no sheet, because nothing is folded away", wide.sheetFromBottomPx, null);
	check("a card's preview takes no press at all", wide.inert, "none");
	check("so a pointer over a widget that would take typing reaches the card instead", wide.hitsTheWidget, false);
	check("and neither can the caret land in it, which is how a preview was typed into", wide.takesTheCaret, false);

	const gutters = await ask(pageFor(theme, catalogueScript, "catalogue"), GUTTER_ASK, 1500);
	console.log(
		`    side gutters ${gutters.gutters.join(" / ")} · facet offset ${gutters.alignment} · tags ${gutters.tagsAreOneRow}px · next ${gutters.nextPadding}`,
	);
	console.log(`    tags markup: ${gutters.tagsHtml}`);
	check("the column's search stands in the same gutter on both sides", gutters.gutters[0], gutters.gutters[1]);
	check("a group's own search lines up with the list under it", gutters.alignment, 0);
	check("the tags never grow past one row", gutters.tagsAreOneRow, 28);
	check("that row scrolls sideways instead", gutters.tagRowScrolls, "auto");
	check(
		"and the count of what is left over is text, not a press into an endless list",
		gutters.countIsPressable,
		"SPAN",
	);
	check("the page's Next row is padded on every side", gutters.nextPadding, "16px/16px");
	check("so it is a row a finger can take", gutters.nextIsTallEnough, true);

	const narrow = await ask(pageFor(theme, catalogueScript, "catalogue"), CATALOGUE_ASK, 1500, null, "420,760");
	check("on a phone's window the dialog is the whole screen", narrow.dialog, narrow.viewport);
	check("with no corner left to round", narrow.corner, "0px");
	check("the column is gone", narrow.sidebars, 0);
	check("and the filters are a sheet sitting on the bottom edge itself", narrow.sheetFromBottomPx, 0);
	check("as wide as the whole screen", narrow.sheetWidthPx, narrow.viewport[0]);
	check("carrying the kit's own grip to drag it by", narrow.gripPaintsAHandle, "44px");
	check("a bare handle, with no box drawn around it", narrow.gripWearsABox, "none rgba(0, 0, 0, 0)");
	check("and the preview stays inert there too", narrow.inert, "none");
}

console.log(failed === 0 ? "\npaint: clean" : `\npaint: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
