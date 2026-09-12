import fs from "node:fs";
import { JSDOM } from "jsdom";
import { transform } from "sucrase";
import { buildMirror } from "./mirror.mjs";

const dom = new JSDOM(`<!doctype html><body><div id="host"></div></body>`, { pretendToBeVisual: true });
for (const key of ["window", "document", "Node", "Element", "HTMLElement", "SVGElement", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame", "MouseEvent", "PointerEvent", "Event", "MutationObserver"]) {
	globalThis[key] = key === "window" ? dom.window : dom.window[key];
}
globalThis.ResizeObserver = class {
	observe() {}
	disconnect() {}
};
globalThis.window.ResizeObserver = globalThis.ResizeObserver;

buildMirror();
const react = await import("react");
const reactDom = await import("react-dom");
const { createElement: h, Fragment } = react;
const { render } = await import("./.mjs-cache/engine/render.mjs");
const { ENGINE_SCOPE } = await import("./.mjs-cache/registry.mjs");
const { api: widgetarium } = ENGINE_SCOPE;
const kit = await import("./.mjs-cache/kit.mjs");
const emojis = await import("./.mjs-cache/emojis.mjs");
const { EMOJI_TABLE } = await import("./.mjs-cache/emoji-table.mjs");
const { collectionGateway, soloGateway } = await import("./.mjs-cache/gateway/create.mjs");

const WIDGET = "widgets/@rank/tier-list/widget.tsx";
const libs = new Map();

function compiled(file, source) {
	return transform(source, {
		transforms: file.endsWith(".tsx") ? ["typescript", "jsx", "imports"] : ["jsx", "imports"],
		jsxPragma: "h",
		jsxFragmentPragma: "Fragment",
		production: true,
		filePath: file,
	}).code;
}

function importing() {
	const modules = { widgetarium, "widgetarium/kit": kit, "widgetarium/kit/emojis": emojis, react, "react-dom": reactDom, ...Object.fromEntries(libs) };
	return (name) => {
		const found = modules[name];
		if (!found) throw new Error(`cannot import "${name}"`);
		return found;
	};
}

function run(file) {
	const shell = { exports: {} };
	const code = compiled(file, fs.readFileSync(file, "utf8"));
	new Function("require", "module", "exports", "h", "Fragment", code)(importing(), shell, shell.exports, h, Fragment);
	return shell.exports;
}

libs.set("@rank/lib", run("widgets/@rank/lib.js"));
const lib = libs.get("@rank/lib");
const TierList = run(WIDGET).default;

let failed = 0;
function check(what, got, wanted) {
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(`${ok ? "ok  " : "FAIL"} ${what}${ok ? "" : ` — got ${JSON.stringify(got)}, wanted ${JSON.stringify(wanted)}`}`);
}

const rowsOf = (values) => values.map((value, at) => ({ ref: `r${at}`, value }));

const TIERS = rowsOf([
	{ label: "S", tone: "error", order: 1 },
	{ label: "A", tone: "warning", order: 2 },
]);

const CARDS = rowsOf([
	{ name: "Pizza", tier: "S", order: 2 },
	{ name: "Ramen", tier: "S", order: 1 },
	{ name: "Tacos", tier: "A", order: 1 },
	{ name: "Falafel" },
	{ name: "Lost", tier: "Gone", order: 4 },
]);

const held = lib.rackOf(TIERS, CARDS);
check("a row holds only the cards that name it", held.rack[0].cards.map((row) => row.value.name), ["Ramen", "Pizza"]);
check("a card with no row waits in the tray", held.tray.map((row) => row.value.name), ["Falafel"]);
check("a card naming a row nobody carries is an orphan, not a tray card", held.orphans.map((row) => row.value.name), ["Lost"]);
check("rows come out in the order they carry", held.rack.map((line) => line.label), ["S", "A"]);

const twinned = lib.rackOf(rowsOf([{ label: "S", order: 1 }, { label: "S", order: 2 }]), CARDS);
check("two rows sharing a name are one row, and its cards are counted once", [twinned.rack.length, twinned.rack[0].cards.length], [1, 2]);

const unnamed = lib.rackOf(rowsOf([{ label: "  ", order: 1 }, { label: "S", order: 2 }]), CARDS);
check("a row with no name is no row", unnamed.rack.map((line) => line.label), ["S"]);

check("a place between two neighbours is their middle", lib.orderBetween({ value: { order: 1 } }, { value: { order: 2 } }), 1.5);
check("a place above everything steps below the first", lib.orderBetween(null, { value: { order: 4 } }), 3);
check("a place under everything steps past the last", lib.orderBetween({ value: { order: 4 } }, null), 5);
check("an empty row starts at one", lib.orderBetween(null, null), 1);
check("a middle that cannot be told from its neighbour asks for a renumber", lib.orderBetween({ value: { order: 1 } }, { value: { order: 1 + Number.EPSILON } }), null);
check("a renumber lays whole numbers in the order given", lib.renumbered(rowsOf([{ name: "a" }, { name: "b" }])).map((row) => row.value.order), [1, 2]);

const moved = lib.placedAt(CARDS, CARDS[0], 3);
check("a card put at an index leaves its old place", moved.map((row) => row.value.name), ["Ramen", "Tacos", "Falafel", "Pizza", "Lost"]);
check("an index past the end lands at the end", lib.placedAt(CARDS, CARDS[0], 99).map((row) => row.value.name).slice(-1), ["Pizza"]);

check("a size that is not a number falls back rather than reaching the stylesheet", [lib.cardSizeOf("abc"), lib.cardSizeOf(""), lib.cardSizeOf(undefined)], [64, 32, 64]);
check("a size is held between its floor and its ceiling", [lib.cardSizeOf(4), lib.cardSizeOf(1e6)], [32, 160]);

check("a bare card draws its letters", lib.pictureOf({ name: "Fried chicken" }), { kind: "letters", letters: "FC" });
check("a web address is drawn as a picture", lib.pictureOf({ name: "Iris", picture: "https://example.com/a.svg" }).kind, "remote");
check("an emoji is named, never typed", lib.pictureOf({ name: "Sleepy", picture: "emoji:sleepy-face" }), { kind: "emoji", name: "sleepy-face", letters: "SL" });
check("an attachment becomes an embed the host can resolve", lib.pictureOf({ name: "Zoe", picture: "faces/zoe.png" }).markdown, "![[faces/zoe.png]]");
check("an embed already written stays as it is", lib.pictureOf({ name: "Zoe", picture: "![[zoe.png]]" }).markdown, "![[zoe.png]]");

check("a new row takes a name no row holds", [lib.freeLabel([]), lib.freeLabel(["New row"]), lib.freeLabel(["New row", "New row 2"])], ["New row", "New row 2", "New row 3"]);
check("the colour after one is the kit's next, and never neutral", [lib.nextToneAfter("accent"), lib.nextToneAfter(kit.TONE_NAMES[kit.TONE_NAMES.length - 1])].includes("neutral"), false);
check("every card colour the hash reaches is one the kit draws", lib.PRESETS[0].cards.every((card) => kit.TONE_NAMES.includes(lib.toneForSeed(card.name))), true);
check("and never the one that paints no rail", lib.PRESETS[0].cards.some((card) => lib.toneForSeed(card.name) === "neutral"), false);
check("a row with a colour the kit does not draw falls back rather than painting nothing", lib.toneOf({ tone: "chartreuse" }), "neutral");

const presetFaults = lib.PRESETS.flatMap((preset) => {
	const names = preset.cards.map((card) => card.name);
	const twins = names.filter((name, at) => names.indexOf(name) !== at);
	const unknownFaces = preset.cards.map((card) => String(card.picture ?? "")).filter((written) => written.startsWith("emoji:") && !EMOJI_TABLE[written.slice(6)]);
	const web = preset.cards.some((card) => String(card.picture ?? "").startsWith("http"));
	return [
		...(names.length >= 10 ? [] : [`${preset.id}: only ${names.length} cards`]),
		...twins.map((name) => `${preset.id}: ${name} is in twice`),
		...unknownFaces.map((written) => `${preset.id}: ${written} is not a face the kit draws`),
		...(web === Boolean(preset.needsTheWeb) ? [] : [`${preset.id}: does not say whether it needs the web`]),
	];
});
check("every preset is whole, and says whether it reaches the web", presetFaults, []);
check("there are ten presets", lib.PRESETS.length, 10);

const host = document.getElementById("host");
const settled = async () => {
	for (let tick = 0; tick < 6; tick += 1) await new Promise((done) => setTimeout(done, 0));
};

const written = [];
let minted = 0;

function writesOver(verbs, name) {
	return {
		...(verbs.includes("create") ? { create: (draft) => (written.push({ verb: `${name}.create`, ...draft }), null) } : {}),
		...(verbs.includes("update") ? { update: (input) => (written.push({ verb: `${name}.update`, ref: input.ref, ...input.data }), null) } : {}),
		...(verbs.includes("remove") ? { remove: (ref) => void written.push({ verb: `${name}.remove`, ref }) } : {}),
		...(verbs.includes("replace") ? { replace: (given) => void written.push({ verb: `${name}.replace`, count: given.length }) } : {}),
	};
}

function listOver(rows, verbs, name) {
	minted += 1;
	const stored = rows.map((row) => ({ ...row }));
	return collectionGateway({
		id: `rank-test/${name}/${minted}`,
		settlesNow: true,
		handlers: { list: () => ({ rows: stored, total: stored.length }), get: (ref) => stored.find((row) => row.ref === ref) ?? null, ...writesOver(verbs, name) },
	});
}

function failing(name) {
	minted += 1;
	return collectionGateway({
		id: `rank-test/${name}/${minted}`,
		handlers: {
			list: () => {
				throw new Error("no such folder");
			},
		},
	});
}

const EVERY_VERB = ["create", "update", "remove", "replace"];

function propsFor({ tiers = TIERS, cards = CARDS, tierVerbs = EVERY_VERB, cardVerbs = EVERY_VERB, isBroken = false }) {
	minted += 1;
	return {
		cards: isBroken ? failing("cards") : listOver(cards, cardVerbs, "cards"),
		tiers: listOver(tiers, tierVerbs, "tiers"),
		title: soloGateway("Comfort food", {}, `rank-test/title/${minted}`),
		cardSize: soloGateway(64, {}, `rank-test/size/${minted}`),
		host: { can: { renderMarkdown: false }, ui: { notify: () => {} } },
	};
}

async function draw(asked = {}) {
	written.length = 0;
	render(null, host);
	render(h(TierList, propsFor(asked)), host);
	await settled();
	return host;
}

const all = (selector) => [...host.querySelectorAll(selector)];
const pressed = (label) => all("button").find((button) => (button.getAttribute("aria-label") ?? button.textContent) === label);
const cardNamed = (name) => all(".wr-card").find((node) => node.querySelector(".wr-cap")?.textContent === name);

await draw();
check("every row the list carries is drawn", all(".wr-rail-label").map((node) => node.textContent), ["S", "A"]);
check("a card is drawn inside the row it names", all(".wr-tier")[0].querySelectorAll(".wr-card").length, 2);
check("the tray holds only what is unranked", all(".wr-tray-row")[1].querySelectorAll(".wr-card").length, 1);
check("an orphan is said out loud rather than quietly trayed", all(".wr-orphans").length, 1);
check("adding a card is offered even when the tray is full", Boolean(pressed("Add a card")), true);

const tacos = cardNamed("Tacos");
tacos.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
await settled();
check("pressing a card picks it up for a second press", all(".wr-card.is-picked").length, 1);

all(".wr-rail")[0].dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
await settled();
check("pressing a row with a card in hand moves that card, in one write", written, [{ verb: "cards.update", ref: "r2", tier: "S", order: 3 }]);

await draw({ cardVerbs: ["list"] });
check("a source nothing can write to offers no add", pressed("Add a card"), undefined);
check("a source nothing can write to offers no reset", all("button").some((button) => button.textContent === "Reset"), false);

await draw({ cardVerbs: ["update"], tierVerbs: ["update"] });
check("presets are offered only where a whole list can be replaced", all("button").some((button) => button.textContent === "Presets"), false);

await draw({ tiers: [] });
check("no rows is a drawn state, not a refusal", all(".wr-empty-note").length, 1);
check("with no rows the ranked cards are orphans and the rest is the tray", [all(".wr-orphans .wr-card").length, all(".wr-tray-row").slice(-1)[0].querySelectorAll(".wr-card").length], [4, 1]);

await draw({ cards: [] });
check("nothing to rank says so", all(".wr-tray-say").length, 1);

await draw({ isBroken: true });
check("a source that cannot be read says so instead of drawing an empty rack", all(".wr-failure").length, 1);

console.log(failed === 0 ? "rank gate: all checks pass" : `rank gate: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
