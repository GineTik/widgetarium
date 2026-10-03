import { JSDOM } from "jsdom";
import type { FunctionComponent, ReactElement, ReactNode } from "react";
import type { Query } from "../packages/core/src/gateway/contract.ts";
import type { WidgetComponent } from "../packages/core/src/registry-scope.js";
import { byId } from "./dom-find.ts";
import { collectionOf, valueGatewayOf } from "./gateway-kinds.ts";
import { fieldIn } from "./held-fields.ts";
import { runWidgetSource } from "./run-widget-source.ts";

const dom = new JSDOM(`<!doctype html><body><div id="host"></div></body>`, { pretendToBeVisual: true });
Object.assign(globalThis, {
	window: dom.window,
	document: dom.window.document,
	Node: dom.window.Node,
	Element: dom.window.Element,
	HTMLElement: dom.window.HTMLElement,
	SVGElement: dom.window.SVGElement,
	getComputedStyle: dom.window.getComputedStyle,
	requestAnimationFrame: dom.window.requestAnimationFrame,
	cancelAnimationFrame: dom.window.cancelAnimationFrame,
	MouseEvent: dom.window.MouseEvent,
	Event: dom.window.Event,
	MutationObserver: dom.window.MutationObserver,
});

interface Sighting {
	readonly isIntersecting: boolean;
	readonly target: Element | undefined;
}

class WatchedEnd {
	readonly nodes: Element[] = [];
	constructor(
		readonly answer: (sightings: readonly Sighting[]) => void,
		readonly options?: IntersectionObserverInit,
	) {
		watchers.add(this);
	}
	observe(node: Element): void {
		this.nodes.push(node);
	}
	disconnect(): void {
		watchers.delete(this);
	}
}

const watchers = new Set<WatchedEnd>();
Object.assign(globalThis, { IntersectionObserver: WatchedEnd });

const react = await import("react");
const { createElement: h, Fragment } = react;
const { render } = await import("../packages/core/src/engine/render.js");
const { ENGINE_SCOPE } = await import("../packages/core/src/registry.js");
const { api: widgetarium } = ENGINE_SCOPE;
const kit = await import("../packages/kit/src/index.ts");
const { arrayGateway, soloGateway } = await import("../packages/core/src/gateway/create.ts");
const { slotDefaults } = await import("../packages/core/src/gateway/props.js");
const { applyQuery, toRows } = await import("../packages/core/src/gateway/create.ts");
const { withSlotSurface } = await import("../packages/core/src/widget-root.js");
const { previewProps } = await import("../packages/core/src/preview.js");
const { manifestOfEveryShippedWidget } = await import("./widget-props.ts");

type FeedProps = Readonly<Record<string, unknown>>;

const isFeed = (value: unknown): value is FunctionComponent<FeedProps> => typeof value === "function";
const isWidgetComponent = (value: unknown): value is WidgetComponent => typeof value === "function";

function defaultExportOf<C>(file: string, isKind: (value: unknown) => value is C): C {
	const modules: Readonly<Record<string, unknown>> = { widgetarium, "widgetarium/kit": kit, react };
	const drawn = runWidgetSource(file, (name) => modules[name], h, Fragment)["default"];
	if (!isKind(drawn)) throw new Error(`${file} exports no component as its default`);
	return drawn;
}

const Feed = defaultExportOf("registry/@default/feed/widget.tsx", isFeed);

let failed = 0;
function check(what: string, got: unknown, wanted: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "ok  " : "FAIL"} ${what}${ok ? "" : ` — got ${JSON.stringify(got)}, wanted ${JSON.stringify(wanted)}`}`,
	);
}

const settled = async (): Promise<void> => {
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
	{ props: { collapsible: { fields: { value: true } } } },
);
check("every declared prop is a gateway", Object.keys(unfed), ["source", "collapsible", "lines"]);
check(
	"the tile's own pick wins over the declared default",
	[
		valueGatewayOf(unfed["source"]).get.can().can,
		await valueGatewayOf(unfed["collapsible"]).get(),
		(await collectionOf(unfed["lines"]).list()).rows.length,
	],
	[true, true, 1],
);

console.log("\n— the feed —");
const NOTES = Array.from({ length: 25 }, (_, at) => {
	const path = `Daily/${String(at + 1).padStart(2, "0")}.md`;
	return { path, content: `Body of ${path}` };
});
const asked: { readonly offset: number; readonly limit: number | null }[] = [];
const items = arrayGateway(
	NOTES,
	{
		list: (query?: Query) => {
			asked.push({ offset: query?.offset ?? 0, limit: query?.limit ?? null });
			return applyQuery(
				toRows(
					NOTES.map((note) => ({ ref: note.path, value: note })),
					"ref",
				),
				query,
			);
		},
	},
	"feed-test/daily",
);

function Probe({ getSource }: { readonly getSource: unknown }): ReactElement {
	return h(
		"p",
		{
			className: "probe",
			"data-ref": String(fieldIn(getSource, "ref") ?? ""),
			"data-path": String(fieldIn(getSource, "path") ?? ""),
		},
		String(fieldIn(getSource, "content") ?? ""),
	);
}

const host = byId(document, "host");
const draw = async (props: FeedProps): Promise<void> => {
	render(h(Feed, props), host);
	await settled();
};
const shown = (): (string | null)[] => [...host.querySelectorAll(".probe")].map((node) => node.textContent);
const firstProbe = (name: string): string | null | undefined => host.querySelector(".probe")?.getAttribute(name);
const reveal = async (): Promise<void> => {
	for (const watcher of [...watchers]) watcher.answer([{ isIntersecting: true, target: watcher.nodes[0] }]);
	await settled();
};

const cards = withSlotSurface(Probe, { surface: "group", isCard: true });
await draw({ getItems: items, getPageSize: soloGateway(10, {}, "feed-test/size"), slots: { item: cards } });
check("the first load draws ten", shown().length, 10);
check("the slotted child is handed the listed row itself, its content included", shown()[0], "Body of Daily/01.md");
check(
	"whole, with its address and every field, not a gateway to read it through",
	[firstProbe("data-ref"), firstProbe("data-path")],
	["Daily/01.md", "Daily/01.md"],
);
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
	component: defaultExportOf("registry/@default/obsidian-markdown-preview/widget.tsx", isWidgetComponent),
};
const cardRegistry = {
	get: (id: string) => (id === "@default/obsidian-markdown-preview" ? markdownPreview : null),
};
const failures: string[] = [];
class Caught extends react.Component<{ readonly children?: ReactNode }, { readonly failed: boolean }> {
	override state = { failed: false };
	static getDerivedStateFromError(): { readonly failed: boolean } {
		return { failed: true };
	}
	override componentDidCatch(failure: unknown): void {
		failures.push(String(failure));
	}
	override render(): ReactNode {
		return this.state.failed ? null : this.props.children;
	}
}
render(null, host);
render(
	h(Caught, null, h(Feed, previewProps({ manifest: manifests["@default/feed"] }, { registry: cardRegistry }))),
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
	getItems: arrayGateway([], {}, "feed-test/empty"),
	getPageSize: soloGateway(10, {}, "feed-test/size"),
	slots: { item: cards },
});
check("an empty source says so", (host.textContent ?? "").trim(), "Nothing here yet.");

render(null, host);
await draw({ getItems: items, getPageSize: soloGateway(10, {}, "feed-test/size"), slots: {} });
check(
	"a feed with no widget in its slot says so",
	(host.textContent ?? "").trim(),
	"This feed has no widget to draw its items with.",
);

console.log(failed ? `\n${failed} failed` : "\nthe feed holds");
process.exit(failed ? 1 : 0);
