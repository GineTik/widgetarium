import * as react from "react";
import * as reactDom from "react-dom";
import type { ReactNode } from "react";
import * as coreModule from "./api-core.js";
import { coreSurface } from "./api-core.js";
import { reactSurface, kit, emojis, isPropsToDefine } from "./widget-api.js";
import * as charts from "@widgetarium/kit/charts";
import { WIDGET_API } from "./version.js";
import { compileWidget } from "./engine/widget-build.js";
import { moduleFromCompiled } from "./engine/compiled-module.js";
import type { RequireModule } from "./engine/compiled-module.js";
import { isObject } from "./engine/is-object.js";
import { declareProps, isDeclaredProps, manifestOfModule } from "./gateway/declared";
import type { DeclaredModule, DeclaredProps } from "./gateway/declared";
import type { GivenProps } from "./declared-widget.js";
import type { DrawWidget } from "./mounted.js";

interface ReactLike {
	readonly version?: unknown;
	readonly createElement: unknown;
	readonly Fragment: unknown;
	readonly useState: unknown;
	readonly useEffect: unknown;
	readonly useMemo: unknown;
	readonly useRef: unknown;
}

export interface WidgetScope {
	readonly instance: unknown;
	readonly react: ReactLike;
	readonly reactDom: unknown;
	readonly api: Readonly<Record<string, unknown>>;
	readonly kit: unknown;
	readonly emojis: unknown;
	readonly charts: unknown;
	readonly draw: DrawWidget<GivenProps> | null;
}

export interface WidgetComponent {
	(given: GivenProps): ReactNode;
	readonly declared?: unknown;
	manifest?: unknown;
}

export interface PackageTaker {
	readonly names: readonly string[];
	take(name: string): unknown;
}

type Libs = ReadonlyMap<string, unknown>;

interface SurfaceBuild {
	readonly reactSurface: Readonly<Record<string, unknown>> & { createWidget(widget: unknown): unknown };
	readonly kit?: unknown;
	readonly emojis?: unknown;
	readonly drawWidget?: unknown;
}

const EXPORT_MISSING =
	'this widget calls "{name}" from "widgetarium", which this Widgetarium (widget API {api}) does not provide — update the plugin';
const MODULE_INTEROP_KEYS = new Set(["__esModule", "default", "then"]);

const CHARTS_NEED_THE_ENGINE_REACT =
	'"widgetarium/kit/charts" draws with the plugin\'s own React, so a widget bringing {react} cannot import it — declare recharts as a dependency of its own instead';

const SURFACE_UNREADABLE = "the widget surface this build carries did not load";

export const ENGINE_SCOPE: WidgetScope = {
	instance: "the plugin's own",
	react,
	reactDom,
	api: { ...coreSurface, ...reactSurface },
	kit,
	emojis,
	charts,
	draw: null,
};

export function foreignScope(
	source: string | null | undefined,
	ownReact: ReactLike,
	ownReactDom: unknown,
): WidgetScope {
	const said = `React ${String(ownReact.version)}`;
	if (!source) throw new Error(`this build carries no widget surface, so a widget cannot bring ${said}`);
	if (!ownReactDom) throw new Error(`a widget asking for ${said} must declare react-dom beside it`);
	if (!isObject(ownReactDom) || typeof ownReactDom["createRoot"] !== "function")
		throw new Error(`the react-dom beside ${said} provides no createRoot`);

	const built = surfaceExports(source, ownReact, ownReactDom);
	return {
		instance: ownReact,
		react: ownReact,
		reactDom: ownReactDom,
		api: {
			...coreSurface,
			...built.reactSurface,
			createWidget: (widget: unknown) =>
				built.reactSurface.createWidget({ ...fieldsOf(widget), inject: declareProps(injectOf(widget)) }),
		},
		kit: built.kit,
		emojis: built.emojis,
		charts: createRefusedModule(CHARTS_NEED_THE_ENGINE_REACT.replace("{react}", said)),
		draw: isDrawWidget(built.drawWidget) ? built.drawWidget : null,
	};
}

export function componentIn(shell: unknown, at: string): WidgetComponent {
	const exported = defaultIn(shell) ?? shell;
	if (!isWidgetComponent(exported)) throw new Error(`${at}: the file must "export default createWidget(...)"`);
	if (exported.declared) exported.manifest = isDeclaredModule(shell) ? manifestOfModule(shell) : null;
	return exported;
}

export function runCode(
	code: string,
	libs: Libs,
	packages?: PackageTaker | null,
	scope: WidgetScope = ENGINE_SCOPE,
): unknown {
	return moduleFromCompiled(code, { require: createRequire(libs, packages, scope), globals: injectedGlobals(scope) });
}

// TRADE-OFF: one path for a widget and for a lib — two would drift on the first change to either
export function runModule(
	source: string,
	filePath: string,
	libs: Libs,
	packages?: PackageTaker | null,
	scope?: WidgetScope,
): unknown {
	return runCode(compileWidget(source, filePath), libs, packages, scope);
}

export function isReactLike(held: unknown): held is ReactLike {
	return isObject(held) && typeof held["createElement"] === "function";
}

function isWidgetComponent(held: unknown): held is WidgetComponent {
	return typeof held === "function";
}

function isDrawWidget(held: unknown): held is DrawWidget<GivenProps> {
	return typeof held === "function";
}

function isDeclaredModule(shell: unknown): shell is DeclaredModule {
	const exported = defaultIn(shell);
	return isObject(shell) && typeof exported === "function" && isDeclaredProps(Reflect.get(exported, "declared"));
}

function defaultIn(shell: unknown): unknown {
	if (!isObject(shell) && typeof shell !== "function") return undefined;
	return Reflect.get(shell, "default");
}

function fieldsOf(held: unknown): Readonly<Record<string, unknown>> {
	return isObject(held) ? held : {};
}

function injectOf(widget: unknown): DeclaredProps {
	const inject = isObject(widget) ? widget["inject"] : undefined;
	return isPropsToDefine(inject) ? inject : {};
}

function injectedGlobals(scope: WidgetScope): Readonly<Record<string, unknown>> {
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

function createRefusedModule(reason: string): object {
	return new Proxy(
		{},
		{
			get(_held, name) {
				if (typeof name !== "string" || MODULE_INTEROP_KEYS.has(name)) return undefined;
				throw new Error(reason);
			},
		},
	);
}

function refusingMissingExports(api: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
	return new Proxy(api, {
		get(held, name) {
			if (typeof name !== "string" || name in held || MODULE_INTEROP_KEYS.has(name)) return Reflect.get(held, name);
			return () => {
				throw new Error(EXPORT_MISSING.replace("{name}", name).replace("{api}", String(WIDGET_API)));
			};
		},
	});
}

function createRequire(libs: Libs, packages: PackageTaker | null | undefined, scope: WidgetScope): RequireModule {
	const modules: Readonly<Record<string, unknown>> = {
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

function surfaceExports(source: string, ownReact: ReactLike, ownReactDom: unknown): SurfaceBuild {
	const take: Readonly<Record<string, unknown>> = {
		react: ownReact,
		"react-dom": ownReactDom,
		"react-dom/client": ownReactDom,
		"widgetarium/core": coreModule,
	};
	const built = moduleFromCompiled(source, { require: (name) => take[name] });
	if (!isSurfaceBuild(built)) throw new Error(SURFACE_UNREADABLE);
	return built;
}

function isSurfaceBuild(built: unknown): built is SurfaceBuild {
	if (!isObject(built)) return false;
	const surface = built["reactSurface"];
	return isObject(surface) && typeof surface["createWidget"] === "function";
}
