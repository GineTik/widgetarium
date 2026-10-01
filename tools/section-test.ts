import { JSDOM } from "jsdom";
import type { FunctionComponent } from "react";
import { isObject } from "../packages/core/src/engine/is-object.js";
import type { DeclaredModule } from "../packages/core/src/gateway/declared-types.js";
import { found } from "./dom-find.ts";
import { runWidgetSource } from "./run-widget-source.ts";

const dom = new JSDOM(`<!doctype html><body><div id="host"></div></body>`, { pretendToBeVisual: true });
class SilentIntersectionObserver {
	observe(): void {}
	disconnect(): void {}
}
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
	IntersectionObserver: SilentIntersectionObserver,
});

const react = await import("react");
const { createElement: h, Fragment } = react;
const { render } = await import("../packages/core/src/engine/render.js");
const { ENGINE_SCOPE } = await import("../packages/core/src/registry.js");
const { api: widgetarium } = ENGINE_SCOPE;
const kit = await import("../packages/kit/src/index.ts");
const { previewProps } = await import("../packages/core/src/preview.js");
const { soloGateway } = await import("../packages/core/src/gateway/create.ts");
const { manifestOfModule } = await import("../packages/core/src/gateway/declared.ts");

type SectionProps = Readonly<Record<string, unknown>>;

const isSection = (value: unknown): value is FunctionComponent<SectionProps> => typeof value === "function";
const isDeclaredModule = (value: unknown): value is DeclaredModule =>
	isObject(value) && typeof value["default"] === "function";
const isRule = (value: unknown): value is (seen: unknown) => unknown => typeof value === "function";
const pathIn = (value: unknown, ...keys: readonly string[]): unknown =>
	keys.reduce<unknown>((held, key) => (isObject(held) ? held[key] : undefined), value);

function run(file: string): Readonly<Record<string, unknown>> {
	const modules: Readonly<Record<string, unknown>> = { widgetarium, "widgetarium/kit": kit, react };
	return runWidgetSource(file, (name) => modules[name], h, Fragment);
}

const loaded = run("registry/@default/section/widget.tsx");
function sectionOf(value: unknown): FunctionComponent<SectionProps> {
	if (!isSection(value)) throw new Error("the section widget exports no component");
	return value;
}

const Section = sectionOf(loaded["default"]);
if (!isDeclaredModule(loaded)) throw new Error("the section widget is no declared module");
const manifest = manifestOfModule(loaded);
const shownAt = (seen: unknown, ...keys: readonly string[]): unknown => {
	const rule = pathIn(manifest, ...keys, "isVisible");
	return isRule(rule) ? rule(seen) : undefined;
};
const declaredProps = pathIn(manifest, "props");
const declaredSpecs = isObject(declaredProps) ? declaredProps : {};

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

const host = found(document, "#host");
const definition = { manifest, component: Section };

async function drawn(props: SectionProps): Promise<Element> {
	const given = previewProps(definition, { registry: null });
	render(h(Section, { ...given, ...props }), host);
	await settled();
	return host;
}

const seenPlaced = { filling: { kind: "value", control: "pick", binding: "hardcode", isSet: false, value: "placed" } };
const seenPerRow = { filling: { kind: "value", control: "pick", binding: "hardcode", isSet: true, value: "per-row" } };

function optionValuesOf(options: unknown): unknown[] {
	return Array.isArray(options) ? options.map((one) => pathIn(one, "value")) : [];
}

console.log("— what the manifest hides —");
check("the placed widgets stand while the section is placed", shownAt(seenPlaced, "mounts", "widgets"), true);
check("and go when it draws one widget per row", shownAt(seenPerRow, "mounts", "widgets"), false);
check("the slot is the other way round", shownAt(seenPerRow, "slots", "item"), true);
check("and is gone while widgets are placed", shownAt(seenPlaced, "slots", "item"), false);
check("the data is asked for only per row", shownAt(seenPerRow, "props", "items"), true);
check(
	"no list prop stands beside a choice",
	Object.keys(declaredSpecs).sort().join(","),
	"arrangement,badge,badgeTone,filling,heading,items,minWidthPx,pageSize",
);
check(
	"a choice names what a person picks, not another prop",
	optionValuesOf(pathIn(declaredSpecs, "filling", "options")),
	["placed", "per-row"],
);
check("and is drawn as a choice", pathIn(declaredSpecs, "filling", "control"), "choice");
check(
	"no prop picks a row of another",
	Object.values(declaredSpecs).filter((spec) => pathIn(spec, "source")).length,
	0,
);
check(
	"the narrowest cell is asked for only in a grid",
	shownAt({ arrangement: { value: "grid" } }, "props", "minWidthPx"),
	true,
);
check("and not in a column", shownAt({ arrangement: { value: "column" } }, "props", "minWidthPx"), false);

console.log("\n— what it draws —");
await drawn({});
check("the heading is an h2", host.querySelectorAll("h2").length, 1);
check("the heading says what the prop says", found(host, "h2").textContent, "Section");
check("an empty section says so", host.querySelector(".wg-section-empty")?.textContent, "Nothing stands here yet.");
check("the body stands as a bare column", found(host, ".wg-kit-layout").className, "wg-kit-layout is-stack");

await drawn({
	arrangement: soloGateway("grid", {}, "section-test:grid"),
	minWidthPx: soloGateway(320, {}, "section-test:320"),
});
const grid = found(host, ".wg-kit-layout");
check("a grid body is a grid", grid.className.includes("is-grid"), true);
check("and wraps once a cell would go under its narrowest", grid.getAttribute("style"), "--wg-kit-layout-min: 320px;");

await drawn({ arrangement: soloGateway("row", {}, "section-test:row") });
check("a row body stands across", found(host, ".wg-kit-layout").className.includes("is-row"), true);

console.log("\n— the badge says what it is —");
check("its tone is a choice, not a colour typed by hand", pathIn(declaredSpecs, "badgeTone", "control"), "choice");
check("and it is asked for only once there is a badge", shownAt({ badge: { value: "" } }, "props", "badgeTone"), false);
check("which is as soon as one is typed", shownAt({ badge: { value: "4 open" } }, "props", "badgeTone"), true);
await drawn({
	badge: soloGateway("2 overdue", {}, "section-test:badge"),
	badgeTone: soloGateway("error", {}, "section-test:tone"),
});
const pill = host.querySelector(".wg-section-head .wg-kit-pill");
check("the badge is drawn beside the heading", pill?.textContent, "2 overdue");
check("in the tone it was given", pill?.className.includes("is-err"), true);
await drawn({ badge: soloGateway("5 open", {}, "section-test:plain") });
check(
	"and neutral when none was",
	host.querySelector(".wg-section-head .wg-kit-pill")?.className.includes("is-"),
	false,
);

console.log("\n— a placed widget wears what its own record says —");
interface PlacedEntry {
	readonly name: string;
	readonly id: string;
	readonly hidden: boolean;
	readonly title: string;
	readonly manifest: null;
	readonly problem: null;
	readonly failure: null;
	readonly drawInto: (element: Element, platesAbove: unknown) => () => void;
	readonly surface: string | null;
	readonly height: null;
}

const entryOf = (name: string, look: Partial<PlacedEntry>): PlacedEntry => ({
	name,
	id: "@probe/leaf",
	hidden: false,
	title: name,
	manifest: null,
	problem: null,
	failure: null,
	drawInto: () => () => {},
	surface: null,
	height: null,
	...look,
});
const plated = (): (string | null)[] =>
	[...host.querySelectorAll(".wg-section-stands")].map((one) => one.getAttribute("data-surface"));
const placedTwo = { widgets: [entryOf("Plain", {}), entryOf("Lifted", { surface: "group" })] };
await drawn({ mounts: placedTwo });
const stands = [...host.querySelectorAll<HTMLElement>(".wg-section-stands")];
check("every placed widget stands in its own wrapper", stands.length, 2);
check("in a column one with no word of its own wears nothing", stands[0]?.getAttribute("data-surface"), null);
check("one that names its own plate wears that one", stands[1]?.getAttribute("data-surface"), "group");
check(
	"and each is as tall as what it draws",
	stands.map((one) => one.style.height),
	["", ""],
);

console.log("\n— the arrangement decides the plates —");
const twoPlain = { widgets: [entryOf("First", {}), entryOf("Second", {})] };
await drawn({ arrangement: soloGateway("grid", {}, "section-test:grid-plates"), mounts: twoPlain });
check("a grid gives every widget its own plate", plated(), ["group", "group"]);
await drawn({ arrangement: soloGateway("row", {}, "section-test:row-plates"), mounts: twoPlain });
check("so does a row", plated(), ["group", "group"]);
await drawn({ arrangement: soloGateway("rows", {}, "section-test:rows-plates"), mounts: twoPlain });
check("rows stand bare, each of them", plated(), [null, null]);
check("inside the one plate the body wears", found(host, ".wg-kit-layout").getAttribute("data-surface"), "group");

console.log("\n— a placed widget is told the plate it stands on —");
const toldOf = (arrangement: string) => {
	const told: unknown[] = [];
	const spy = entryOf("Spy", {
		drawInto: (_element, platesAbove) => {
			told.push(pathIn(platesAbove, "surface") ?? null);
			return () => {};
		},
	});
	return {
		told,
		mounts: { widgets: [spy] },
		arrangement: soloGateway(arrangement, {}, `section-test:told-${arrangement}`),
	};
};
const onGrid = toldOf("grid");
await drawn({ arrangement: onGrid.arrangement, mounts: onGrid.mounts });
check("in a grid it is drawn knowing it stands on a group", onGrid.told.at(-1), "group");
const onColumn = toldOf("column");
await drawn({ arrangement: onColumn.arrangement, mounts: onColumn.mounts });
check("in a column it is drawn knowing it stands on nothing", onColumn.told.at(-1), "none");

console.log(`\n${failed === 0 ? "section gate: clean" : `section gate: ${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
