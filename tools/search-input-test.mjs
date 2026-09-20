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
	"Event",
	"MutationObserver",
]) {
	globalThis[key] = key === "window" ? dom.window : dom.window[key];
}

buildMirror();
const react = await import("react");
const { createElement: h, Fragment } = react;
const { flushSync } = await import("react-dom");
const { render } = await import("./.mjs-cache/engine/render.mjs");
const { ENGINE_SCOPE } = await import("./.mjs-cache/registry.mjs");
const kit = await import("./.mjs-cache/kit.mjs");
const { soloGateway } = await import("./.mjs-cache/gateway/create.mjs");

const WIDGET = "widgets/@default/search-input/widget.tsx";
const modules = { widgetarium: ENGINE_SCOPE.api, "widgetarium/kit": kit, react };
const code = transform(fs.readFileSync(WIDGET, "utf8"), {
	transforms: ["typescript", "jsx", "imports"],
	jsxPragma: "h",
	jsxFragmentPragma: "Fragment",
	production: true,
	filePath: WIDGET,
}).code;
const shell = { exports: {} };
new Function("require", "module", "exports", "h", "Fragment", code)(
	(name) => modules[name],
	shell,
	shell.exports,
	h,
	Fragment,
);
const SearchInput = shell.exports.default;

let failed = 0;
function check(what, got, wanted) {
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "ok  " : "FAIL"} ${what}${ok ? "" : ` — got ${JSON.stringify(got)}, wanted ${JSON.stringify(wanted)}`}`,
	);
}

const host = document.getElementById("host");
let held = "draft";
const written = [];
const value = soloGateway(
	() => held,
	{
		update: (typed) => {
			written.push(typed);
			held = typed;
		},
	},
	"search-test/value",
);
const placeholder = soloGateway("Search widgets", {}, "search-test/placeholder");

render(h(SearchInput, { value, placeholder }), host);
const input = host.querySelector("input");
check("the placeholder is read from its gateway", input?.placeholder, "Search widgets");
check("the field opens on the value the gateway holds", input?.value, "draft");
check("the search icon stands beside the field", Boolean(host.querySelector(".wg-kit-field svg")), true);

const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
flushSync(() => {
	setValue.call(input, "tasks");
	input.dispatchEvent(new window.Event("input", { bubbles: true }));
});
await new Promise((settle) => setTimeout(settle, 0));
check("typing writes the text through the value's update", written, ["tasks"]);
check("the field shows what was typed", host.querySelector("input").value, "tasks");

render(null, host);
const fixed = soloGateway("fixed", {}, "search-test/fixed");
render(h(SearchInput, { value: fixed, placeholder }), host);
check(
	"a value with no update is read-only rather than silently dropping keys",
	host.querySelector("input").readOnly,
	true,
);
render(null, host);

if (failed > 0) {
	console.log(`\n${failed} failed`);
	process.exit(1);
}
