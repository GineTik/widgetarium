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
globalThis.IntersectionObserver = class {
	observe() {}
	disconnect() {}
};

buildMirror();
const react = await import("react");
const { createElement: h, Fragment } = react;
const { render } = await import("./.mjs-cache/engine/render.mjs");
const { ENGINE_SCOPE } = await import("./.mjs-cache/registry.mjs");
const { api: widgetarium } = ENGINE_SCOPE;
const kit = await import("./.mjs-cache/kit.mjs");
const { previewProps } = await import("./.mjs-cache/preview.mjs");
const { soloGateway } = await import("./.mjs-cache/gateway/create.mjs");

const plainJs = (file) =>
	transform(fs.readFileSync(file, "utf8"), {
		transforms: ["typescript", "jsx", "imports"],
		jsxPragma: "h",
		jsxFragmentPragma: "Fragment",
		production: true,
		filePath: file,
	}).code;

function run(file) {
	const shell = { exports: {} };
	const modules = { widgetarium, "widgetarium/kit": kit, react };
	const load = new Function("require", "module", "exports", "h", "Fragment", plainJs(file));
	load((name) => modules[name], shell, shell.exports, h, Fragment);
	return shell.exports;
}

const loaded = run("widgets/@default/section/widget.tsx");
const Section = loaded.default;
const { manifest } = loaded;

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

const host = document.getElementById("host");

async function drawn(props) {
	const given = previewProps({ manifest, component: Section }, { registry: null });
	render(h(Section, { ...given, ...props }), host);
	await settled();
	return host;
}

const seenPlaced = { filling: { kind: "value", control: "pick", binding: "hardcode", isSet: false, value: "placed" } };
const seenPerRow = { filling: { kind: "value", control: "pick", binding: "hardcode", isSet: true, value: "per-row" } };

console.log("— what the manifest hides —");
check("the placed widgets stand while the section is placed", manifest.mounts.widgets.isVisible(seenPlaced), true);
check("and go when it draws one widget per row", manifest.mounts.widgets.isVisible(seenPerRow), false);
check("the slot is the other way round", manifest.slots.item.isVisible(seenPerRow), true);
check("and is gone while widgets are placed", manifest.slots.item.isVisible(seenPlaced), false);
check("the data is asked for only per row", manifest.props.items.isVisible(seenPerRow), true);
check(
	"no list prop stands beside a choice",
	Object.keys(manifest.props).sort().join(","),
	"arrangement,badge,badgeTone,filling,heading,items,minWidthPx,pageSize",
);
check(
	"a choice names what a person picks, not another prop",
	manifest.props.filling.options.map((one) => one.value),
	["placed", "per-row"],
);
check("and is drawn as a choice", manifest.props.filling.control, "choice");
check("no prop picks a row of another", Object.values(manifest.props).filter((spec) => spec.of).length, 0);
check(
	"the narrowest cell is asked for only in a grid",
	manifest.props.minWidthPx.isVisible({ arrangement: { value: "grid" } }),
	true,
);
check("and not in a column", manifest.props.minWidthPx.isVisible({ arrangement: { value: "column" } }), false);

console.log("\n— what it draws —");
await drawn({});
check("the heading is an h2", host.querySelectorAll("h2").length, 1);
check("the heading says what the prop says", host.querySelector("h2").textContent, "Section");
check("an empty section says so", host.querySelector(".wg-section-empty")?.textContent, "Nothing stands here yet.");
check("the body stands as a bare column", host.querySelector(".wg-kit-layout").className, "wg-kit-layout is-stack");

await drawn({
	arrangement: soloGateway("grid", {}, "section-test:grid"),
	minWidthPx: soloGateway(320, {}, "section-test:320"),
});
const grid = host.querySelector(".wg-kit-layout");
check("a grid body is a grid", grid.className.includes("is-grid"), true);
check("and wraps once a cell would go under its narrowest", grid.getAttribute("style"), "--wg-kit-layout-min: 320px;");

await drawn({ arrangement: soloGateway("row", {}, "section-test:row") });
check("a row body stands across", host.querySelector(".wg-kit-layout").className.includes("is-row"), true);

console.log("\n— the badge says what it is —");
check("its tone is a choice, not a colour typed by hand", manifest.props.badgeTone.control, "choice");
check(
	"and it is asked for only once there is a badge",
	manifest.props.badgeTone.isVisible({ badge: { value: "" } }),
	false,
);
check("which is as soon as one is typed", manifest.props.badgeTone.isVisible({ badge: { value: "4 open" } }), true);
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
const entryOf = (name, look) => ({
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
const plated = () => [...host.querySelectorAll(".wg-section-stands")].map((one) => one.getAttribute("data-surface"));
const placedTwo = { widgets: [entryOf("Plain", {}), entryOf("Lifted", { surface: "group", height: 200 })] };
await drawn({ mounts: placedTwo });
const stands = [...host.querySelectorAll(".wg-section-stands")];
check("every placed widget stands in its own wrapper", stands.length, 2);
check("in a column one with no word of its own wears nothing", stands[0].getAttribute("data-surface"), null);
check("one that names its own plate wears that one", stands[1].getAttribute("data-surface"), "group");
check("and is as tall as its record says", stands[1].style.height, "200px");
check("while the other is as tall as it needs", stands[0].style.height, "");

console.log("\n— the arrangement decides the plates —");
const twoPlain = { widgets: [entryOf("First", {}), entryOf("Second", {})] };
await drawn({ arrangement: soloGateway("grid", {}, "section-test:grid-plates"), mounts: twoPlain });
check("a grid gives every widget its own plate", plated(), ["group", "group"]);
await drawn({ arrangement: soloGateway("row", {}, "section-test:row-plates"), mounts: twoPlain });
check("so does a row", plated(), ["group", "group"]);
await drawn({ arrangement: soloGateway("rows", {}, "section-test:rows-plates"), mounts: twoPlain });
check("rows stand bare, each of them", plated(), [null, null]);
check("inside the one plate the body wears", host.querySelector(".wg-kit-layout").getAttribute("data-surface"), "group");

console.log("\n— a placed widget is told the plate it stands on —");
const toldOf = (arrangement) => {
	const told = [];
	const spy = { ...entryOf("Spy", {}), drawInto: (element, platesAbove) => (told.push(platesAbove?.surface ?? null), () => {}) };
	return { told, mounts: { widgets: [spy] }, arrangement: soloGateway(arrangement, {}, `section-test:told-${arrangement}`) };
};
const onGrid = toldOf("grid");
await drawn({ arrangement: onGrid.arrangement, mounts: onGrid.mounts });
check("in a grid it is drawn knowing it stands on a group", onGrid.told.at(-1), "group");
const onColumn = toldOf("column");
await drawn({ arrangement: onColumn.arrangement, mounts: onColumn.mounts });
check("in a column it is drawn knowing it stands on nothing", onColumn.told.at(-1), "none");

console.log(`\n${failed === 0 ? "section gate: clean" : `section gate: ${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
