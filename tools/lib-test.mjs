import { JSDOM } from "jsdom";
import { buildMirror } from "./mirror.mjs";

buildMirror();

const dom = new JSDOM("<!doctype html><body></body>");
for (const key of ["window", "document", "Node", "Element", "HTMLElement", "SVGElement", "getComputedStyle"]) {
	globalThis[key] = key === "window" ? dom.window : dom.window[key];
}

const { WidgetRegistry } = await import("./.mjs-cache/registry.mjs");

const ROOT = ".widgetarium/widgets";

function vaultOf(files) {
	const adapter = {
		async exists(path) {
			return Object.hasOwn(files, path) || Object.keys(files).some((key) => key.startsWith(`${path}/`));
		},
		async list(path) {
			const folders = new Set();
			const found = [];
			for (const key of Object.keys(files)) {
				if (!key.startsWith(`${path}/`)) continue;
				const rest = key.slice(path.length + 1);
				const cut = rest.indexOf("/");
				if (cut === -1) found.push(key);
				else folders.add(`${path}/${rest.slice(0, cut)}`);
			}
			return { files: found, folders: [...folders] };
		},
		async read(path) {
			return files[path];
		},
	};
	return { vault: { adapter } };
}

const LIB = `export const RATE = 21;
export function streakOf(days) {
	return days.length;
}
`;

const WIDGET = `import { streakOf, RATE } from "@habit/lib";
import { createWidget } from "widgetarium";
export default createWidget(function Probe({ days = [] }) {
	return h("b", null, streakOf(days) + "/" + RATE);
});
`;

const FILES = {
	[`${ROOT}/@habit/lib.js`]: LIB,
	[`${ROOT}/@habit/probe/manifest.json`]: JSON.stringify({ id: "@habit/probe", title: "Probe" }),
	[`${ROOT}/@habit/probe/widget.jsx`]: WIDGET,
};

let failed = 0;
let checks = 0;
const check = (name, got, want) => {
	checks += 1;
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
};

{
	const registry = new WidgetRegistry(vaultOf(FILES));
	await registry.load();
	const entry = registry.get("@habit/probe");

	check("the widget beside a lib still loads", Boolean(entry?.component), true);
	check("and nothing failed on the way", entry?.error ?? null, null);
	check("the lib is served under the scope's own name", registry.libs.has("@habit/lib"), true);
	check("its exports are what the file exported", Object.keys(registry.libs.get("@habit/lib")).sort(), ["RATE", "streakOf"]);
	check("and what the widget draws came from it", entry.component({ days: ["a", "b", "c"] }).props.children, "3/21");
}

{
	const registry = new WidgetRegistry(vaultOf({ ...FILES, [`${ROOT}/@habit/probe/widget.jsx`]: `import "nowhere";\nexport default () => null;\n` }));
	await registry.load();
	const entry = registry.get("@habit/probe");
	check("an import of something else is still refused", String(entry?.error ?? ""), 'Error: cannot import "nowhere" — a widget may only import widgetarium, widgetarium/kit, react, react-dom, @habit/lib');
}

{
	const said = [];
	const wasError = console.error;
	console.error = (...parts) => said.push(parts.join(" "));
	const registry = new WidgetRegistry(vaultOf({ ...FILES, [`${ROOT}/@habit/lib.js`]: "export const broken = (" }));
	await registry.load();
	console.error = wasError;

	check("a lib that will not parse is reported", said.some((line) => line.includes("@habit/lib.js")), true);
	check("and it is not served", registry.libs.has("@habit/lib"), false);
	check("so the widget that wanted it fails by name", String(registry.get("@habit/probe")?.error ?? "").includes("@habit/lib"), true);
}

{
	const registry = new WidgetRegistry(vaultOf({ [`${ROOT}/@task/probe/manifest.json`]: JSON.stringify({ id: "@task/probe" }), [`${ROOT}/@task/probe/widget.jsx`]: "export default () => null;" }));
	await registry.load();
	check("a scope with no lib loads exactly as before", Boolean(registry.get("@task/probe")?.component), true);
	check("and serves none", registry.libs.size, 0);
}

console.log(`\n${failed === 0 ? `lib gate: clean (${checks} checks)` : `lib gate: ${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
