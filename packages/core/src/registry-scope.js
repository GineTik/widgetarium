import * as react from "react";
import * as reactDom from "react-dom";
import * as coreModule from "./api-core.js";
import { coreSurface } from "./api-core.js";
import { reactSurface, kit, emojis } from "./widget-api.js";
import * as charts from "@widgetarium/kit/charts";
import { WIDGET_API } from "./version.js";
import { compileWidget } from "./engine/widget-build.js";
import { moduleFromCompiled } from "./engine/compiled-module.js";
import { manifestOfModule } from "./gateway/declared";

const EXPORT_MISSING =
	'this widget calls "{name}" from "widgetarium", which this Widgetarium (widget API {api}) does not provide — update the plugin';
const MODULE_INTEROP_KEYS = new Set(["__esModule", "default", "then"]);

const CHARTS_NEED_THE_ENGINE_REACT =
	'"widgetarium/kit/charts" draws with the plugin\'s own React, so a widget bringing {react} cannot import it — declare recharts as a dependency of its own instead';

export const ENGINE_SCOPE = {
	instance: "the plugin's own",
	react,
	reactDom,
	api: { ...coreSurface, ...reactSurface },
	kit,
	emojis,
	charts,
	draw: null,
};

export function foreignScope(source, ownReact, ownReactDom) {
	const said = `React ${ownReact.version}`;
	if (!source) throw new Error(`this build carries no widget surface, so a widget cannot bring ${said}`);
	if (!ownReactDom) throw new Error(`a widget asking for ${said} must declare react-dom beside it`);
	if (typeof ownReactDom.createRoot !== "function")
		throw new Error(`the react-dom beside ${said} provides no createRoot`);

	const built = surfaceExports(source, ownReact, ownReactDom);
	return {
		instance: ownReact,
		react: ownReact,
		reactDom: ownReactDom,
		api: {
			...coreSurface,
			...built.reactSurface,
			createWidget: (widget) =>
				built.reactSurface.createWidget({ ...widget, inject: coreSurface.defineProps(widget?.inject ?? {}) }),
		},
		kit: built.kit,
		emojis: built.emojis,
		charts: refusedModule(CHARTS_NEED_THE_ENGINE_REACT.replace("{react}", said)),
		draw: built.drawWidget,
	};
}

export function componentIn(shell, at) {
	const exported = shell.default ?? shell;
	if (typeof exported !== "function") throw new Error(`${at}: the file must "export default createWidget(...)"`);
	if (exported.declared) exported.manifest = manifestOfModule(shell);
	return exported;
}

export function runCode(code, libs, packages, scope = ENGINE_SCOPE) {
	return moduleFromCompiled(code, { require: createRequire(libs, packages, scope), globals: injectedGlobals(scope) });
}

// TRADE-OFF: one path for a widget and for a lib — two would drift on the first change to either
export function runModule(source, filePath, libs, packages, scope) {
	return runCode(compileWidget(source, filePath), libs, packages, scope);
}

function injectedGlobals(scope) {
	return {
		h: scope.react.createElement,
		Fragment: scope.react.Fragment,
		kitModule: scope.kit,
		useState: scope.react.useState,
		useEffect: scope.react.useEffect,
		useMemo: scope.react.useMemo,
		useRef: scope.react.useRef,
	};
}

function refusedModule(reason) {
	return new Proxy(
		{},
		{
			get(held, name) {
				if (typeof name !== "string" || MODULE_INTEROP_KEYS.has(name)) return undefined;
				throw new Error(reason);
			},
		},
	);
}

function refusingMissingExports(api) {
	return new Proxy(api, {
		get(held, name) {
			if (typeof name !== "string" || name in held || MODULE_INTEROP_KEYS.has(name)) return held[name];
			return () => {
				throw new Error(EXPORT_MISSING.replace("{name}", name).replace("{api}", String(WIDGET_API)));
			};
		},
	});
}

function createRequire(libs, packages, scope) {
	const modules = {
		widgetarium: refusingMissingExports(scope.api),
		"widgetarium/kit": scope.kit,
		"widgetarium/kit/emojis": scope.emojis,
		"widgetarium/kit/charts": scope.charts,
		react: scope.react,
		"react-dom": scope.reactDom,
		...Object.fromEntries(libs),
	};
	return (name) => {
		const found = packages?.take(name) ?? modules[name];
		if (!found)
			throw new Error(
				`cannot import "${name}" — a widget may only import ${[...Object.keys(modules), ...(packages?.names ?? [])].join(", ")}`,
			);
		return found;
	};
}

function surfaceExports(source, ownReact, ownReactDom) {
	const take = {
		react: ownReact,
		"react-dom": ownReactDom,
		"react-dom/client": ownReactDom,
		"widgetarium/core": coreModule,
	};
	return moduleFromCompiled(source, { require: (name) => take[name] });
}
