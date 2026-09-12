import { execFileSync } from "node:child_process";
import esbuild from "esbuild";

export const TEXT_LOADERS = { ".md": "text" };

const SUPPLIED_BY_ELECTRON_AT_RUNTIME = ["obsidian", "electron", "node:fs/promises", "node:path"];

const HELD_BY_THE_ONE_CORE = /^\.\/(cache|create|narrow|emoji-table\.js)$/;

function coreProvides() {
	return {
		name: "widgetarium-core-provides",
		setup(build) {
			build.onResolve({ filter: HELD_BY_THE_ONE_CORE }, () => ({ path: "widgetarium/core", external: true }));
		},
	};
}

export function surfaceOptions({ minify = false } = {}) {
	return {
		entryPoints: ["src/widget-api.js"],
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

function surfaceSource({ minify }) {
	return {
		name: "widgetarium-surface-source",
		setup(build) {
			build.onResolve({ filter: /^widgetarium:surface$/ }, (found) => ({ path: found.path, namespace: "wg-surface" }));
			build.onLoad({ filter: /.*/, namespace: "wg-surface" }, async () => {
				const built = await esbuild.build(surfaceOptions({ minify }));
				return {
					contents: `export const REACT_SURFACE_SOURCE = ${JSON.stringify(built.outputFiles[0].text)};`,
					loader: "js",
				};
			});
		},
	};
}

export function bundleOptions({ outfile = "main.js", minify = false, sourcemap = false } = {}) {
	return {
		plugins: [surfaceSource({ minify })],
		entryPoints: ["src/main.js"],
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

function runGates() {
	const widgetsInVault = `${process.env.WG_VAULT ?? ""}/.widgetarium/widgets`;
	const alsoInVault = process.env.WG_VAULT ? [widgetsInVault] : [];
	const gateRoots = ["src", "styles.css", "manifest.json", "tools", "install.mjs", ...alsoInVault];
	try {
		execFileSync("node", ["tools/lint-language.mjs", ...gateRoots], { stdio: "inherit" });
		execFileSync("node", ["tools/check-shadow.mjs"], { stdio: "inherit" });
		execFileSync("node", ["tools/check-width.mjs", "widgets", ...alsoInVault], { stdio: "inherit" });
		execFileSync("node", ["tools/check-appearance.mjs", "widgets", ...alsoInVault], { stdio: "inherit" });
		execFileSync("node", ["tools/check-classes.mjs", "widgets", ...alsoInVault], { stdio: "inherit" });
		execFileSync("node", ["tools/check-adaptive.mjs", "widgets", ...alsoInVault], { stdio: "inherit" });
		execFileSync("node", ["tools/check-overrides.mjs", "styles.css"], { stdio: "inherit" });
		execFileSync("node", ["tools/check-one-law.mjs", "src"], { stdio: "inherit" });
	} catch {
		process.exit(1);
	}
}

if (import.meta.main) {
	const production = process.argv.includes("--prod");
	runGates();
	await esbuild.build(bundleOptions({ minify: production, sourcemap: production ? false : "inline" }));
}
