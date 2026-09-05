// CONTEXT: jsdom lays nothing out and resolves no cascade, so every check here runs in real Chrome
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
	console.log(`${ok ? "OK  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
}

function collect(from, into, prefix) {
	for (const name of readdirSync(from)) {
		const full = path.join(from, name);
		const key = `${prefix}/${name}`;
		if (statSync(full).isDirectory()) collect(full, into, key);
		else if (/\.(json|jsx|js|css)$/.test(name)) into[key] = readFileSync(full, "utf8");
	}
	return into;
}

const files = collect("widgets", {}, WIDGETS_DIR);

const THEMES = {
	light: `--background-primary:#ffffff;--background-secondary:#f6f6f6;--background-modifier-border:#e4e4e4;
		--background-modifier-hover:rgba(0,0,0,0.05);--text-normal:#222222;--text-muted:#707070;--text-faint:#a0a0a0;
		--text-on-accent:#ffffff;--text-error:#c0392b;--text-success:#1f8a4c;--interactive-accent:#6d4ee0;`,
	dark: `--background-primary:#1e1e1e;--background-secondary:#161616;--background-modifier-border:#333333;
		--background-modifier-hover:rgba(255,255,255,0.07);--text-normal:#dadada;--text-muted:#999999;--text-faint:#6b6b6b;
		--text-on-accent:#ffffff;--text-error:#e06c5f;--text-success:#4ec97f;--interactive-accent:#8b6cef;`,
};

async function bundle(source) {
	const built = await esbuild.build({
		stdin: { contents: source, resolveDir: ROOT, loader: "jsx", sourcefile: "probe.jsx" },
		bundle: true,
		write: false,
		format: "iife",
		platform: "browser",
		target: "es2020",
		jsxFactory: "h",
		jsxFragment: "Fragment",
		inject: ["tools/fill-inject.js"],
		alias: { widgetarium: "./tools/fill-shim.js", "widgetarium/kit": "./src/kit.js", "widgetarium/kit/emojis": "./src/emojis.js", "@habit/lib": "./widgets/@habit/lib.js", obsidian: "./tools/obsidian-shim.js" },
		logLevel: "warning",
	});
	return built.outputFiles[0].text;
}

function pageFor(theme, script, name) {
	const page = `<!doctype html><html><head><meta charset="utf-8">
<style>${readFileSync("styles.css", "utf8")}</style>
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

async function openChrome(file) {
	const port = 9300 + Math.floor(Math.random() * 500);
	const profile = mkdtempSync(path.join(tmpdir(), "wg-paint-profile-"));
	const chrome = spawn(
		CHROME,
		["--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars", "--window-size=1280,900",
			`--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, `file://${file}`],
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

async function ask(file, expression, settleMs, hover) {
	const { chrome, socketUrl } = await openChrome(file);
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
		why = onPage.result?.result?.value || JSON.stringify(reply.result.exceptionDetails.exception ?? reply.result.exceptionDetails);
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
const START = normalizeRules([{ id: "sub-0", name: "Code", mode: "line", open: "!code", widget: "@inline/code-block" }]);
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
import { Button, Card, Icon, IconButton, List, Row } from "./src/kit.js";
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
	]),
	document.getElementById("host"),
);
`;

const MOUNT_PROBE = `
import { createElement as h } from "react";
import { render } from "./src/engine/render.js";
import { WidgetSurface } from "./src/surface.js";
import { normalizeBoard } from "./src/model.js";

const GROUP_ID = "@core/view-group";
const KANBAN_ID = "@task/kanban-board";
const ARCHIVE_ID = "@task/archived-columns";
const INLINE_ID = "@inline/reminder";
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
	render(h(WidgetSurface, { board, registry, host, editing: true, initialWidth: 1240, onChange: (next) => { board = next; draw(); } }), node);
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

const STREAK_RAIL_PX = 836;
const STREAK_SLACK_PX = 830;
const STREAK_TILE_PX = 120;
const STREAK_HEIGHT_PX = JSON.parse(readFileSync("widgets/@habit/streak/manifest.json", "utf8")).tallestPx;
const STREAK_NATURAL_PX = 84;

const STREAK_PROBE = `
import { createElement as h } from "react";
import { render } from "./src/engine/render.js";
import Widget from "./widgets/@habit/streak/widget.tsx";
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
})()`

const [subScript, kitScript, mountScript, streakScript] = await Promise.all([bundle(SUB_PROBE), bundle(KIT_PROBE), bundle(MOUNT_PROBE), bundle(STREAK_PROBE)]);

for (const theme of ["light", "dark"]) {
	console.log(`\n— ${theme} —`);

	const side = await ask(pageFor(theme, subScript, "sub"), SUB_ASK, 3000);
	check("the substitutions sidebar is drawn at all", side.found, true);
	check("and carries no inset edge", side.insetLayers, 0);
	check("its cast is the kit lift, both layers", side.layers, 2);
	check("and that cast paints beside the block, as every sidebar's does", side.reachesSideways, true);

	const kit = await ask(pageFor(theme, kitScript, "kit"), KIT_ASK, 1200);
	check("a raised control carries a hairline on the ::before that owns its corner", kit.rowButton, { edges: 1, widthPx: 1, inkAlpha: 0.09 });

	const hovered = await ask(pageFor(theme, kitScript, "kit"), KIT_HOVER_ASK, 1200, "#row-button");
	check("the pointer turns a raised control's fill grey", hovered.hoveredFill, hovered.hoverFill);
	check("and the hairline goes with it, because a grey control has no edge", hovered.hoveredEdges, 0);
	check("while the control beside it, untouched, keeps its own", hovered.restingEdges, 1);
	check("so does a raised icon button", kit.rowIcon, { edges: 1, widthPx: 1, inkAlpha: 0.09 });
	check("and the control that carries it is the RAISED one, not a colour we guessed", kit.rowButtonIsRaised, true);
	check("a grey neutral button has none", kit.neutralButton, null);
	check("nor has a grey neutral icon button", kit.neutralIcon, null);
	check("and that grey is the kit fill, a step away from the raised one", [kit.neutralIsTheGreyFill, kit.raisedIsNotTheGreyFill], [true, true]);
	check("an accent button has none, because its fill already says control", kit.accentButton, null);
	check("nor has a danger one", kit.dangerButton, null);
	check("nor has a plain one", kit.plainButton, null);
	check("glass keeps its own edge, undoubled", kit.glassIcon, { edges: 1, widthPx: 1, inkAlpha: 0.12 });
	check("the focus ring outranks the edge it lands on", kit.focusRing, { layers: 1, inset: false, spreadPx: 2 });
	check("a plain light card is still edgeless", kit.plainCard, "none");
	check("and only a lifted card draws one", kit.liftedCardInsets, 1);

	const row = await ask(pageFor(theme, ROW_SCRIPT, "row"), ROW_ASK, 1200);
	check("a long value never squeezes the label off its own row", row.labelWidthPx > 0, true);
	check("the label is read whole, not clipped to nothing", row.labelSaid, "Value");
	check("the value gives way instead, and says so with an ellipsis", row.valueClipped, true);

	const mount = await ask(pageFor(theme, mountScript, "mount"), MOUNT_ASK, 2500);
	check("a mount row ends in two controls", mount.trailingCount, 2);
	check("spaced the way the kit spaces adjacent controls", mount.gaps, [8]);
	check("adding a view opens the catalogue", mount.opened, true);
	check("which says what the press means", mount.said, "Add a view");
	check("it offers the widgets that can stand on their own", mount.offered, ["Archived columns", "Kanban board", "View group"]);
	check("drawing each as the widget it is", mount.everyCardDrawsTheWidget, true);
	check("and it can be searched", mount.searchable, true);
	check("no bare list of titles is left anywhere", mount.bareList, false);
	check("a pick lands under its declared name, disambiguated", mount.names, ["Kanban", "Archived columns", "Archived columns 2", "Add a view"]);

	const streak = await ask(pageFor(theme, streakScript, "streak"), STREAK_ASK, 2000);
	check("the streak rail takes the whole tile", streak.tight.railWidthPx, STREAK_RAIL_PX);
	check("and leaves no unpainted slack across it", [streak.tight.unpaintedPx, streak.slack.unpaintedPx], [0, 0]);
	check("the days start one connector in, not on a centring margin", streak.tight.firstColumnStartsAtPx, 12);
	check("and end one connector from the far side", streak.tight.lastColumnEndsAtPx, 12);
	check("every column is the width of the next", streak.tight.widestColumnPx - streak.tight.narrowestColumnPx < 1, true);
	check("a width that fitted eighteen days before now fits nineteen", streak.tight.columns, 19);
	check("no column is squeezed under the ring it holds", streak.tight.narrowestColumnPx >= 36, true);
	check("where a day is left over, the columns take the room instead of a margin", streak.slack.widestColumnPx > 44, true);
	check("and they still fill the rail exactly", [streak.slack.columns, streak.slack.railWidthPx], [18, STREAK_SLACK_PX]);
	check("the habit is named over the rail", [streak.titleSaid, streak.titleAboveRail], ["Meditation", true]);
	check("the streak draws itself in one fixed height", streak.naturalPx, STREAK_NATURAL_PX);
	check("and the tile it pins itself to has room for that", STREAK_HEIGHT_PX >= streak.naturalPx, true);
	check("beside a drawn emoji, not a typed one", streak.emojiDrawn, true);
	console.log(`    gaps above/between/below: ${streak.abovePx} / ${streak.betweenPx} / ${streak.belowPx} in a ${streak.tilePx}px tile; name at ${streak.titleStartsAtPx} vs ring at ${streak.firstRingStartsAtPx}; count at ${streak.countEndsAtPx} vs ring at ${streak.lastRingEndsAtPx}`);
	check("the tile is drawn at its own two-cell height", streak.tilePx, 120);
	check("the row above the rail is spaced as evenly as the rail is below it", [streak.abovePx, streak.betweenPx], [streak.belowPx, streak.belowPx]);
	check("the name starts where the first ring starts", Math.abs(streak.titleStartsAtPx - streak.firstRingStartsAtPx) <= 0.5, true);
	check("and the run count ends where the last ring ends", Math.abs(streak.countEndsAtPx - streak.lastRingEndsAtPx) <= 0.5, true);
}

console.log(failed === 0 ? "\npaint: clean" : `\npaint: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
