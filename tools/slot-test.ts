import { layJsdomGlobals } from "./jsdom-globals.ts";
import type { InjectedWidget } from "../packages/core/src/declared-widget.ts";

const dom = layJsdomGlobals();
Object.assign(globalThis, {
	requestAnimationFrame: dom.window.requestAnimationFrame ?? ((done: () => void) => setTimeout(done, 0)),
	cancelAnimationFrame: dom.window.cancelAnimationFrame ?? (() => undefined),
	MutationObserver: dom.window.MutationObserver,
});

const { createElement: h } = await import("react");
const { render } = await import("../packages/core/src/engine/render.js");
const { createWidget } = await import("../packages/core/src/widget-api.ts");
const { ISlot } = await import("../packages/core/src/gateway/declared.ts");
const { manifestOfModule } = await import("../packages/core/src/gateway/declared.ts");

let failed = 0;
function check(what: string, got: unknown, wanted: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${what}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(wanted)}`}`,
	);
}

const settled = async (): Promise<void> => {
	for (let turn = 0; turn < 4; turn += 1) await new Promise((done) => setTimeout(done, 5));
};

const entryOf = (name: string, extra: Record<string, unknown> = {}) => ({
	name,
	hidden: false,
	title: name,
	manifest: null,
	problem: null,
	failure: null,
	surface: null,
	height: null,
	drawInto: (element: HTMLElement) => {
		element.textContent = `drawn ${name}`;
		return () => undefined;
	},
	...extra,
});

const Layout = createWidget({
	inject: { hero: ISlot, main: ISlot.array(), empty: ISlot },
	draw: ({ hero: Hero, main, empty: Empty }) =>
		h("div", { id: "layout" }, [
			h("header", { key: "hero" }, h(Hero, null)),
			h(
				"main",
				{ key: "main", "data-count": main.length },
				main.map((Slot) => h(Slot, { key: Slot.id })),
			),
			h("aside", { key: "empty" }, h(Empty, null)),
		]),
});

const Drawn: InjectedWidget = Layout;
const host = document.createElement("div");
document.body.appendChild(host);
const given = () => ({
	mounts: {
		hero: [entryOf("Hero", { manifest: { preferredSize: { preferredWidth: 160 } } })],
		main: [
			entryOf("Reach out", { manifest: { role: "control" } }),
			entryOf("Hidden", { hidden: true }),
			entryOf("Follow up"),
		],
		empty: [],
	},
});

render(h(Drawn, given()), host);
await settled();
const before = [...host.querySelectorAll(".wg-mounted")];
check("a single slot draws its one widget", host.querySelector("header")?.textContent, "drawn Hero");
check(
	"a slot array is an array of the shown widgets, hidden ones left out",
	[host.querySelector("main")?.getAttribute("data-count"), host.querySelector("main")?.textContent],
	["2", "drawn Reach outdrawn Follow up"],
);
check("an empty single slot draws nothing", host.querySelector("aside")?.childNodes.length, 0);
check(
	"a preferred size never sizes a slot: the page decides the place, and the slot carries no width of its own",
	[
		host.querySelector("header .wg-slot")?.className,
		(host.querySelector("header .wg-slot") as HTMLElement | null)?.getAttribute("style"),
	],
	["wg-slot", null],
);
check(
	"a control is as wide as what it draws; every other role fills its place",
	[...host.querySelectorAll("main .wg-slot")].map((slot) => slot.className),
	["wg-slot is-content-width", "wg-slot"],
);

render(h(Drawn, given()), host);
await settled();
const after = [...host.querySelectorAll(".wg-mounted")];
check(
	"a re-render keeps every placed widget mounted: same elements, nothing thrown away",
	after.length === before.length && after.every((element, at) => element === before[at]),
	true,
);

const { defineStates } = await import("../packages/core/src/gateway/declared.ts");
const states = defineStates(Layout, {
	Full: { hero: { widget: "@default/hero", state: "Full" }, main: [{ widget: "@crm/reach-out", surface: "group" }] },
});
check("a state names what stands in each slot by widget id and that widget's own state", Object.keys(states.Full), [
	"hero",
	"main",
]);
// @ts-expect-error a slot in a state is a widget named by id, never a plain value
defineStates(Layout, { Wrong: { main: "Reach out" } });

const manifest = manifestOfModule({
	default: Layout,
	metadata: { title: "Layout" },
	layout: { role: "layout", size: { preferredWidth: "full", preferredHeight: "auto" } },
});
const mounts = (manifest as { mounts?: Record<string, { single?: boolean }> }).mounts ?? {};
check(
	"the manifest says which slot holds one widget and which a list",
	[mounts["hero"]?.single, mounts["main"]?.single ?? false],
	[true, false],
);

console.log(`\n${failed === 0 ? "slots: clean" : `slots: ${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
