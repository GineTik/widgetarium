import { execFileSync } from "node:child_process";
import esbuild, { type BuildOptions, type Loader, type OutputFile, type Plugin } from "esbuild";
import { widgetTypeFiles } from "../../tools/widget-types.mts";
import { packedModuleSource } from "../../tools/packed-module.mts";
import { catalogueWidgetFiles, catalogueWidgetPaths } from "../../tools/catalogue-widget-files.mts";

export interface SurfaceAsk {
	readonly minify?: boolean;
}

export interface BundleAsk {
	readonly outfile?: string;
	readonly minify?: boolean;
	readonly sourcemap?: boolean | "inline";
}

export const TEXT_LOADERS: Readonly<Record<string, Loader>> = { ".md": "text", ".css": "text" };

const WIDGETS_CLI_SPECIFIER = "widgetarium:widgets-cli";
const WIDGETS_CLI_SOURCE = "apps/obsidian/src/ai/widgets-cli.ts";
const WIDGET_TYPES_SPECIFIER = "widgetarium:widget-types";
const CATALOGUE_WIDGETS_SPECIFIER = "widgetarium:catalogue-widgets";
const BUILD_STAMP_SPECIFIER = "widgetarium:build-stamp";

const SUPPLIED_BY_ELECTRON_AT_RUNTIME = [
	"obsidian",
	"electron",
	"node:fs",
	"node:fs/promises",
	"node:path",
	"node:child_process",
];

const HELD_BY_THE_ONE_CORE =
	/^(\.\/(cache|create|narrow|(emoji|icon)-table(\.js)?)|@widgetarium\/kit\/(emoji-table|icons)|tailwind-merge)$/;

export async function widgetsCliBundle(): Promise<string> {
	const built = await esbuild.build(widgetsCliOptions());
	return firstOutputText(built.outputFiles);
}

export function widgetsCliBundleSync(): string {
	return firstOutputText(esbuild.buildSync(widgetsCliOptions()).outputFiles);
}

export function surfaceOptions({ minify = false }: SurfaceAsk = {}): BuildOptions {
	return {
		entryPoints: ["packages/core/src/widget-api.ts"],
		bundle: true,
		write: false,
		format: "cjs",
		platform: "browser",
		target: "es2020",
		external: ["react", "react-dom", "react-dom/client", "widgetarium/core"],
		plugins: [coreProvides()],
		jsxFactory: "h",
		jsxFragment: "Fragment",
		minify,
		logLevel: "warning",
	};
}

export function bundleOptions({
	outfile = "apps/obsidian/main.js",
	minify = false,
	sourcemap = false,
}: BundleAsk = {}): BuildOptions {
	return {
		plugins: [
			surfaceSource(minify),
			widgetsCliSource(),
			widgetTypesSource(),
			catalogueWidgetsSource(),
			buildStampSource(),
		],
		entryPoints: ["apps/obsidian/src/main.ts"],
		bundle: true,
		outfile,
		format: "cjs",
		platform: "browser",
		target: "es2020",
		external: SUPPLIED_BY_ELECTRON_AT_RUNTIME,
		loader: TEXT_LOADERS,
		jsxFactory: "h",
		jsxFragment: "Fragment",
		sourcemap,
		minify,
		logLevel: "info",
	};
}

function firstOutputText(files: readonly OutputFile[] | undefined): string {
	const first = files?.[0];
	if (!first) throw new Error("esbuild wrote no output file");
	return first.text;
}

function widgetsCliOptions(): BuildOptions {
	return {
		entryPoints: [WIDGETS_CLI_SOURCE],
		bundle: true,
		write: false,
		format: "esm",
		platform: "node",
		target: "node18",
		charset: "utf8",
		external: ["node:fs/promises", "node:path", "node:url", "node:module"],
		// TRADE-OFF: a banner, because esbuild's own require shim throws for a dependency that still reaches for one
		banner: {
			js: 'import { createRequire as __needs } from "node:module";\nconst require = __needs(import.meta.url);',
		},
		logLevel: "warning",
	};
}

function widgetsCliSource(): Plugin {
	return {
		name: "widgetarium-widgets-cli",
		setup(build) {
			build.onResolve({ filter: new RegExp(`^${WIDGETS_CLI_SPECIFIER}$`) }, (found) => ({
				path: found.path,
				namespace: "wg-cli",
			}));
			build.onLoad({ filter: /.*/, namespace: "wg-cli" }, async () => ({
				contents: packedModuleSource(await widgetsCliBundle()),
				loader: "js",
				watchFiles: [WIDGETS_CLI_SOURCE],
			}));
		},
	};
}

function widgetTypesSource(): Plugin {
	return {
		name: "widgetarium-widget-types",
		setup(build) {
			build.onResolve({ filter: new RegExp(`^${WIDGET_TYPES_SPECIFIER}$`) }, (found) => ({
				path: found.path,
				namespace: "wg-types",
			}));
			build.onLoad({ filter: /.*/, namespace: "wg-types" }, () => ({
				contents: packedModuleSource(widgetTypeFiles()),
				loader: "js",
				watchFiles: [
					"packages/sdk/types/widgetarium.d.ts",
					"packages/sdk/tsconfig.widgets.json",
					"packages/kit/package.json",
				],
			}));
		},
	};
}

function catalogueWidgetsSource(): Plugin {
	return {
		name: "widgetarium-catalogue-widgets",
		setup(build) {
			build.onResolve({ filter: new RegExp(`^${CATALOGUE_WIDGETS_SPECIFIER}$`) }, (found) => ({
				path: found.path,
				namespace: "wg-catalogue-widgets",
			}));
			build.onLoad({ filter: /.*/, namespace: "wg-catalogue-widgets" }, () => ({
				contents: `export default ${JSON.stringify(catalogueWidgetFiles())};`,
				loader: "js",
				watchFiles: catalogueWidgetPaths(),
			}));
		},
	};
}

function buildStampSource(): Plugin {
	return {
		name: "widgetarium-build-stamp",
		setup(build) {
			build.onResolve({ filter: new RegExp(`^${BUILD_STAMP_SPECIFIER}$`) }, (found) => ({
				path: found.path,
				namespace: "wg-build-stamp",
			}));
			build.onLoad({ filter: /.*/, namespace: "wg-build-stamp" }, () => ({
				contents: `export const BUILD_STAMP = ${JSON.stringify(new Date().toISOString())};`,
				loader: "js",
			}));
		},
	};
}

function coreProvides(): Plugin {
	return {
		name: "widgetarium-core-provides",
		setup(build) {
			build.onResolve({ filter: HELD_BY_THE_ONE_CORE }, () => ({ path: "widgetarium/core", external: true }));
		},
	};
}

function surfaceSource(minify: boolean): Plugin {
	return {
		name: "widgetarium-surface-source",
		setup(build) {
			build.onResolve({ filter: /^widgetarium:surface$/ }, (found) => ({ path: found.path, namespace: "wg-surface" }));
			build.onLoad({ filter: /.*/, namespace: "wg-surface" }, async () => {
				const built = await esbuild.build(surfaceOptions({ minify }));
				return {
					contents: `export const REACT_SURFACE_SOURCE = ${JSON.stringify(firstOutputText(built.outputFiles))};`,
					loader: "js",
				};
			});
		},
	};
}

function runGates(): void {
	const widgetsInVault = `${process.env["WG_VAULT"] ?? ""}/.widgetarium/widgets`;
	const alsoInVault = process.env["WG_VAULT"] ? [widgetsInVault] : [];
	const gateRoots = ["apps", "packages", "tools", ...alsoInVault];
	try {
		execFileSync("node", ["tools/lint-language.mts", ...gateRoots], { stdio: "inherit" });
		execFileSync("node", ["tools/check-classes.mts", "registry", ...alsoInVault], { stdio: "inherit" });
		execFileSync("node", ["tools/check-adaptive.mts", "registry", ...alsoInVault], { stdio: "inherit" });
		execFileSync("node", ["tools/check-overrides.mts", "apps/obsidian/styles.css"], { stdio: "inherit" });
	} catch {
		process.exit(1);
	}
}

if (import.meta.main) {
	const production = process.argv.includes("--prod");
	runGates();
	await esbuild.build(bundleOptions({ minify: production, sourcemap: production ? false : "inline" }));
}
