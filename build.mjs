import { execFileSync } from "node:child_process";
import esbuild from "esbuild";

const SUPPLIED_BY_ELECTRON_AT_RUNTIME = ["obsidian", "electron", "node:fs/promises", "node:path"];

export function bundleOptions({ outfile = "main.js", minify = false, sourcemap = false } = {}) {
	return {
		entryPoints: ["src/main.js"],
		bundle: true,
		outfile,
		format: "cjs",
		platform: "browser",
		target: "es2020",
		external: SUPPLIED_BY_ELECTRON_AT_RUNTIME,
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
