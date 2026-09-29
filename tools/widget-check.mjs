import fs from "node:fs";
import path from "node:path";
import { transform } from "sucrase";
import { act, createElement as h, Fragment } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { SAMPLE_KINDS, rowsSample, sampleOf } from "./schema-samples.mjs";

const dom = new JSDOM("<!doctype html><body></body>");
for (const key of ["window", "document", "Node", "Element", "HTMLElement", "SVGElement", "getComputedStyle"]) {
	globalThis[key] = key === "window" ? dom.window : dom.window[key];
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
dom.window.Element.prototype.scrollIntoView ??= () => {};
globalThis.ResizeObserver ??= class {
	observe() {}
	disconnect() {}
};

const { ENGINE_SCOPE } = await import("../packages/core/src/registry.js");
const { previewProps } = await import("../packages/core/src/preview.js");
const { manifestOf } = await import("../packages/core/src/engine/catalogue-index.js");
const { manifestOfModule } = await import("../packages/core/src/gateway/declared.ts");
const { SOURCE_FILES, compileWidgetFolder } = await import("../packages/core/src/engine/widget-build.js");
const { widgetModulesOnDisk } = await import("./publish.mjs");
const { declarationIn } = await import("../packages/core/src/gateway/declaration.ts");

const libs = new Map();

function run(file, source) {
	return runCompiled(
		transform(source, {
			transforms: ["typescript", "jsx", "imports"],
			jsxPragma: "h",
			jsxFragmentPragma: "Fragment",
			production: true,
			filePath: file,
		}).code,
	);
}

function sourcesIn(folder) {
	return Object.fromEntries(
		widgetModulesOnDisk(folder).map((name) => [name, fs.readFileSync(path.join(folder, name), "utf8")]),
	);
}

function runCompiled(code) {
	const modules = {
		widgetarium: ENGINE_SCOPE.api,
		"widgetarium/kit": ENGINE_SCOPE.kit,
		"widgetarium/kit/emojis": ENGINE_SCOPE.emojis,
		"widgetarium/kit/charts": ENGINE_SCOPE.charts,
		react: ENGINE_SCOPE.react,
		"react-dom": ENGINE_SCOPE.reactDom,
		...Object.fromEntries(libs),
	};
	const shell = { exports: {} };
	new Function("require", "module", "exports", "h", "Fragment", code)(
		(name) => {
			const found = modules[name];
			if (!found) throw new Error(`cannot import "${name}"`);
			return found;
		},
		shell,
		shell.exports,
		h,
		Fragment,
	);
	return shell.exports;
}

function samplesFor(declared, kind) {
	const sampled = Object.entries(declared ?? {}).flatMap(([name, held]) => {
		const declaration = declarationIn(held);
		if (declaration?.kind === "collection") return [[name, rowsSample(declaration.schema, kind)]];
		if (declaration?.kind !== "value" || kind === "empty") return [];
		const value = sampleOf(declaration.schema, kind);
		return value === undefined ? [] : [[name, value]];
	});
	return Object.fromEntries(sampled);
}

function widgetFile(folder) {
	return SOURCE_FILES.map((name) => path.join(folder, name)).find((at) => fs.existsSync(at)) ?? null;
}

async function drawn(element) {
	const container = document.createElement("div");
	const root = createRoot(container, { onUncaughtError: (failure) => (container.failure = failure) });
	await act(async () => root.render(element));
	const html = container.innerHTML;
	await act(async () => root.unmount());
	if (container.failure) throw container.failure;
	return html;
}

let failed = 0;
const root = "registry";
const scopes = fs.readdirSync(root).filter((name) => name.startsWith("@"));

for (const scope of scopes) {
	const file = ["lib.ts", "lib.tsx", "lib.js"]
		.map((name) => path.join(root, scope, name))
		.find((at) => fs.existsSync(at));
	if (file) libs.set(`${scope}/lib`, run(file, fs.readFileSync(file, "utf8")));
}

for (const scope of scopes) {
	for (const name of fs.readdirSync(path.join(root, scope))) {
		const folder = path.join(root, scope, name);
		const file = widgetFile(folder);
		if (!file) continue;

		console.error = (...said) =>
			refusals.push(said.map((part) => (typeof part === "string" ? part : JSON.stringify(part))).join(" "));
		const refusals = [];
		try {
			const record = JSON.parse(fs.readFileSync(path.join(folder, "manifest.generated.json"), "utf8"));
			const sources = sourcesIn(folder);
			const shell = runCompiled(compileWidgetFolder(sources, folder));
			const component = shell.default;
			const manifest = manifestOf(
				{ ...record, id: `${scope}/${name}` },
				{ ...component, manifest: manifestOfModule(shell) },
			);
			const html = await drawn(h(component, previewProps({ manifest }, {})));

			if (!html || html.length < 20) throw new Error("rendered almost nothing");
			const refused = refusals.find((said) => said.includes("[widgetarium]"));
			if (refused) throw new Error(refused);
			for (const kind of SAMPLE_KINDS) {
				try {
					await drawn(h(component, { ...previewProps({ manifest }, {}), ...samplesFor(component.declared, kind) }));
				} catch (failure) {
					throw new Error(`draws its preview but not ${kind} data its own schema allows: ${failure.message}`);
				}
			}
			const hexes = [
				...new Set(
					Object.values(sources)
						.join("\n")
						.match(/#[0-9a-fA-F]{6}\b/g) ?? [],
				),
			];
			console.log(
				`OK  ${scope}/${name} — ${html.length} chars, ${hexes.length} raw hex ${hexes.length ? `(${hexes.join(" ")})` : ""}`,
			);
		} catch (failure) {
			failed += 1;
			console.log(`!!  ${scope}/${name} — ${failure.message}`, process.env.WG_STACK ? failure.stack : "");
		}
	}
}

console.log(failed ? `\n${failed} failed` : "\nall widgets build and render");
process.exit(failed ? 1 : 0);
