import fs from "node:fs";
import { JSDOM } from "jsdom";
import { transform } from "sucrase";
import { buildMirror } from "./mirror.mjs";

const dom = new JSDOM(`<!doctype html><body><div id="host"></div></body>`, { pretendToBeVisual: true });
for (const key of [
	"window",
	"document",
	"Node",
	"Element",
	"HTMLElement",
	"SVGElement",
	"getComputedStyle",
	"requestAnimationFrame",
	"cancelAnimationFrame",
	"MouseEvent",
	"Event",
	"MutationObserver",
]) {
	globalThis[key] = key === "window" ? dom.window : dom.window[key];
}

const watchers = new Set();
globalThis.IntersectionObserver = class {
	constructor(answer, options) {
		this.answer = answer;
		this.options = options;
		this.nodes = [];
		watchers.add(this);
	}
	observe(node) {
		this.nodes.push(node);
	}
	disconnect() {
		watchers.delete(this);
	}
};

buildMirror();
const react = await import("react");
const { createElement: h, Fragment } = react;
const { render } = await import("./.mjs-cache/engine/render.mjs");
const { ENGINE_SCOPE } = await import("./.mjs-cache/registry.mjs");
const { api: widgetarium } = ENGINE_SCOPE;
const kit = await import("./.mjs-cache/kit.mjs");
const { arrayGateway, soloGateway } = await import("./.mjs-cache/gateway/create.mjs");
const { slotDefaults } = await import("./.mjs-cache/gateway/props.mjs");
const { applyQuery, toRows } = await import("./.mjs-cache/gateway/create.mjs");
const { surfacedSlot } = await import("./.mjs-cache/widget-root.mjs");
const { previewProps } = await import("./.mjs-cache/preview.mjs");
const { manifestOfEveryShippedWidget } = await import("./widget-props.mjs");

function run(file) {
	const shell = { exports: {} };
	const code = transform(fs.readFileSync(file, "utf8"), {
		transforms: ["typescript", "jsx", "imports"],
		jsxPragma: "h",
		jsxFragmentPragma: "Fragment",
		production: true,
		filePath: file,
	}).code;
	const modules = { widgetarium, "widgetarium/kit": kit, react };
	new Function("require", "module", "exports", "h", "Fragment", code)(
		(name) => modules[name],
		shell,
		shell.exports,
		h,
		Fragment,
	);
	return shell.exports;
}

const Feed = run("widgets/@default/feed/widget.tsx").default;

let failed = 0;
function check(what, got, wanted) {
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "ok  " : "FAIL"} ${what}${ok ? "" : ` — got ${JSON.stringify(got)}, wanted ${JSON.stringify(wanted)}`}`,
	);
}

const settled = async () => {
	for (let turn = 0; turn < 6; turn += 1) await new Promise((done) => setTimeout(done, 10));
};

console.log("— a list reads one page at a time —");
const numbered = toRows(Array.from({ length: 25 }, (_, at) => ({ n: at })));
check(
	"offset and limit cut one page",
	applyQuery(numbered, { offset: 10, limit: 10 }).rows.map((row) => row.n),
	[10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
);
check(
	"the last page holds what is left, and total counts them all",
	[applyQuery(numbered, { offset: 20, limit: 10 }).rows.length, applyQuery(numbered, { offset: 20, limit: 10 }).total],
	[5, 25],
);
check(
	"an offset alone reads to the end",
	applyQuery(numbered, { offset: 23 }).rows.map((row) => row.n),
	[23, 24],
);

console.log("\n— a slot's child gets what its parent does not feed it —");
const unfed = slotDefaults(
	{
		id: "@x/preview",
		props: {
			source: { kind: "value", default: { value: "" } },
			collapsible: { kind: "value", default: { value: false } },
			lines: { kind: "collection", default: { rows: ["a"] } },
		},
	},
	{ props: { collapsible: { value: true } } },
);
check("every declared prop is a gateway", Object.keys(unfed), ["source", "collapsible", "lines"]);
check(
	"the tile's own pick wins over the declared default",
	[unfed.source.get.can().can, await unfed.collapsible.get(), (await unfed.lines.list()).rows.length],
	[true, true, 1],
);

console.log("\n— the feed —");
const NOTES = Array.from({ length: 25 }, (_, at) => ({ path: `Daily/${String(at + 1).padStart(2, "0")}.md` }));
const asked = [];
const items = arrayGateway(
	NOTES,
	{
		list: (query) => {
			asked.push({ offset: query?.offset ?? 0, limit: query?.limit ?? null });
			return applyQuery(
				toRows(
					NOTES.map((note) => ({ ref: note.path, value: note })),
					"ref",
				),
				query,
			);
		},
		get: (ref) => ({ ref, value: { path: ref, content: `Body of ${ref}` } }),
	},
	"feed-test/daily",
);

function Probe({ source }) {
	const record = widgetarium.useData(source.get).data;
	return h("p", { className: "probe" }, record?.content ?? "");
}

const host = document.getElementById("host");
const draw = async (props) => {
	render(h(Feed, props), host);
	await settled();
};
const shown = () => [...host.querySelectorAll(".probe")].map((node) => node.textContent);
const reveal = async () => {
	for (const watcher of [...watchers]) watcher.answer([{ isIntersecting: true, target: watcher.nodes[0] }]);
	await settled();
};

const cards = surfacedSlot(Probe, { surface: "group", isCard: true });
await draw({ items, pageSize: soloGateway(10, {}, "feed-test/size"), slots: { item: cards } });
check("the first load draws ten", shown().length, 10);
check("each item is read whole through the collection's get, not the listed record", shown()[0], "Body of Daily/01.md");
check(
	"the list was asked for the first page only",
	asked.filter((one) => one.limit === 10).every((one) => one.offset === 0),
	true,
);
check(
	"every item stands in the plate its slot wears",
	host.querySelectorAll('.wg-slot[data-surface="group"]').length,
	10,
);
check("and the list spaces them as cards", Boolean(host.querySelector(".wg-kit-slot-list[data-cards]")), true);
check(
	"the end of the feed is watched, ahead of the viewport",
	[watchers.size, [...watchers][0]?.options?.rootMargin],
	[1, "400px 0px"],
);

await reveal();
check("when the end comes into view, ten more are drawn", shown().length, 20);
check(
	"by asking for the next page, not for everything again",
	asked.some((one) => one.offset === 10 && one.limit === 10),
	true,
);

await reveal();
check("the last page draws what is left", shown().length, 25);
check("and nothing watches for more once the list has run out", watchers.size, 0);
check("every item is drawn once, in order", shown().at(-1), "Body of Daily/25.md");

console.log("\n— the catalogue card —");
const manifests = await manifestOfEveryShippedWidget();
const markdownPreview = {
	manifest: manifests["@default/obsidian-markdown-preview"],
	component: run("widgets/@default/obsidian-markdown-preview/widget.tsx").default,
};
const cardRegistry = { get: (id) => (id === "@default/obsidian-markdown-preview" ? markdownPreview : null) };
const failures = [];
class Caught extends react.Component {
	constructor(props) {
		super(props);
		this.state = { failed: false };
	}
	static getDerivedStateFromError() {
		return { failed: true };
	}
	componentDidCatch(failure) {
		failures.push(String(failure));
	}
	render() {
		return this.state.failed ? null : this.props.children;
	}
}
render(null, host);
render(
	h(
		Caught,
		null,
		h(Feed, previewProps({ manifest: manifests["@default/feed"], component: Feed }, { registry: cardRegistry })),
	),
	host,
);
await settled();
check(
	"the catalogue card draws the feed with its default slot, with nothing thrown",
	[failures, host.querySelectorAll('.wg-slot[data-surface="group"]').length],
	[[], 3],
);

render(null, host);
await draw({
	items: arrayGateway([], {}, "feed-test/empty"),
	pageSize: soloGateway(10, {}, "feed-test/size"),
	slots: { item: cards },
});
check("an empty source says so", host.textContent.trim(), "Nothing here yet.");

render(null, host);
await draw({ items, pageSize: soloGateway(10, {}, "feed-test/size"), slots: {} });
check(
	"a feed with no widget in its slot says so",
	host.textContent.trim(),
	"This feed has no widget to draw its items with.",
);

console.log(failed ? `\n${failed} failed` : "\nthe feed holds");
process.exit(failed ? 1 : 0);
