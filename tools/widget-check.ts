import fs from "node:fs";
import path from "node:path";
import { transform } from "sucrase";
import { act, createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";
import type { WidgetComponent } from "../packages/core/src/registry-scope.js";
import type { DeclaredModule } from "../packages/core/src/gateway/declared.ts";
import { layJsdomGlobals } from "./jsdom-globals.ts";
import { isRecord } from "./page-dom.ts";
import { SAMPLE_KINDS, rowsSample, sampleOf } from "./schema-samples.ts";
import type { SampleKind } from "./schema-samples.ts";

const dom = layJsdomGlobals();
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
dom.window.Element.prototype.scrollIntoView ??= () => {};
if (!("ResizeObserver" in globalThis))
	Object.assign(globalThis, {
		ResizeObserver: class {
			observe(): void {}
			disconnect(): void {}
		},
	});

const { ENGINE_SCOPE } = await import("../packages/core/src/registry.js");
const { previewProps } = await import("../packages/core/src/preview.js");
const { manifestOf } = await import("../packages/core/src/engine/catalogue-index.js");
const { isDeclaredProps, manifestOfModule } = await import("../packages/core/src/gateway/declared.ts");
const { LIB_FILES, SOURCE_FILES, compileWidgetFolder } = await import("../packages/core/src/engine/widget-build.js");
const { widgetModulesOnDisk } = await import("./publish.ts");
const { declarationIn } = await import("../packages/core/src/gateway/declaration.ts");

type Exports = Record<string, unknown>;

const libs = new Map<string, unknown>();

function isWidgetComponent(held: unknown): held is WidgetComponent {
	return typeof held === "function";
}

function isDeclaredModule(shell: Exports): shell is Exports & DeclaredModule {
	const exported = shell["default"];
	return typeof exported === "function" && isDeclaredProps(Reflect.get(exported, "declared"));
}

function messageOf(failure: unknown): string {
	return failure instanceof Error ? failure.message : String(failure);
}

function run(file: string, source: string): Exports {
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

function sourcesIn(folder: string): Record<string, string> {
	const names: readonly string[] = widgetModulesOnDisk(folder);
	return Object.fromEntries(names.map((name) => [name, fs.readFileSync(path.join(folder, name), "utf8")]));
}

function runCompiled(code: string): Exports {
	const modules: Readonly<Record<string, unknown>> = {
		widgetarium: ENGINE_SCOPE.api,
		"widgetarium/kit": ENGINE_SCOPE.kit,
		"widgetarium/kit/emojis": ENGINE_SCOPE.emojis,
		"widgetarium/kit/charts": ENGINE_SCOPE.charts,
		react: ENGINE_SCOPE.react,
		"react-dom": ENGINE_SCOPE.reactDom,
		...Object.fromEntries(libs),
	};
	const shell: { exports: Exports } = { exports: {} };
	new Function("require", "module", "exports", "h", "Fragment", code)(
		(name: string) => {
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

function samplesFor(declared: unknown, kind: SampleKind): Record<string, unknown> {
	const entries = isRecord(declared) ? Object.entries(declared) : [];
	const sampled = entries.flatMap(([name, held]): [string, unknown][] => {
		const declaration = declarationIn(held);
		if (declaration?.kind === "collection") return [[name, rowsSample(declaration.schema, kind)]];
		if (declaration?.kind !== "value" || kind === "empty") return [];
		const value = sampleOf(declaration.schema, kind);
		return value === undefined ? [] : [[name, value]];
	});
	return Object.fromEntries(sampled);
}

function widgetFile(folder: string): string | null {
	return SOURCE_FILES.map((name) => path.join(folder, name)).find((at) => fs.existsSync(at)) ?? null;
}

async function drawn(element: ReactElement): Promise<string> {
	const container = document.createElement("div");
	let uncaught: unknown = null;
	const root = createRoot(container, {
		onUncaughtError: (failure) => {
			uncaught = failure;
		},
	});
	await act(async () => root.render(element));
	const html = container.innerHTML;
	await act(async () => root.unmount());
	if (uncaught) throw uncaught;
	return html;
}

let failed = 0;
const root = "registry";
const scopes = fs.readdirSync(root).filter((name) => name.startsWith("@"));

for (const scope of scopes) {
	const file = LIB_FILES.map((name) => path.join(root, scope, name)).find((at) => fs.existsSync(at));
	if (file) libs.set(`${scope}/lib`, run(file, fs.readFileSync(file, "utf8")));
}

for (const scope of scopes) {
	for (const name of fs.readdirSync(path.join(root, scope))) {
		const folder = path.join(root, scope, name);
		const file = widgetFile(folder);
		if (!file) continue;

		const refusals: string[] = [];
		console.error = (...said: unknown[]) =>
			refusals.push(said.map((part) => (typeof part === "string" ? part : JSON.stringify(part))).join(" "));
		try {
			const record: unknown = JSON.parse(fs.readFileSync(path.join(folder, "manifest.generated.json"), "utf8"));
			const sources = sourcesIn(folder);
			const shell = runCompiled(compileWidgetFolder(sources, folder));
			const component = shell["default"];
			if (!isWidgetComponent(component)) throw new Error("exports no component");
			const manifest = manifestOf(
				{ title: undefined, ...(isRecord(record) ? record : {}), id: `${scope}/${name}` },
				{ ...component, manifest: isDeclaredModule(shell) ? manifestOfModule(shell) : null },
			);
			const html = await drawn(h(component, previewProps({ manifest }, {})));

			if (!html || html.length < 20) throw new Error("rendered almost nothing");
			const refused = refusals.find((said) => said.includes("[widgetarium]"));
			if (refused) throw new Error(refused);
			for (const kind of SAMPLE_KINDS) {
				try {
					await drawn(h(component, { ...previewProps({ manifest }, {}), ...samplesFor(component.declared, kind) }));
				} catch (failure) {
					throw new Error(`draws its preview but not ${kind} data its own schema allows: ${messageOf(failure)}`);
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
			const stack = failure instanceof Error ? failure.stack : "";
			console.log(`!!  ${scope}/${name} — ${messageOf(failure)}`, process.env["WG_STACK"] ? stack : "");
		}
	}
}

console.log(failed ? `\n${failed} failed` : "\nall widgets build and render");
process.exit(failed ? 1 : 0);
