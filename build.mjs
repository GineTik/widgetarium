import { execFileSync } from "node:child_process";
import esbuild from "esbuild";

const production = process.argv.includes("--prod");

const WIDGETS = `${process.env.WG_VAULT ?? ""}/.widgetarium/widgets`;
const gateRoots = ["src", "styles.css", "manifest.json", "tools", "install.mjs"];
if (process.env.WG_VAULT) gateRoots.push(WIDGETS);

try {
	execFileSync("node", ["tools/lint-language.mjs", ...gateRoots], { stdio: "inherit" });
	execFileSync("node", ["tools/check-shadow.mjs"], { stdio: "inherit" });
	execFileSync("node", ["tools/check-width.mjs", "widgets", ...(process.env.WG_VAULT ? [WIDGETS] : [])], { stdio: "inherit" });
	execFileSync("node", ["tools/check-appearance.mjs", "widgets", ...(process.env.WG_VAULT ? [WIDGETS] : [])], { stdio: "inherit" });
	execFileSync("node", ["tools/check-classes.mjs", "widgets", ...(process.env.WG_VAULT ? [WIDGETS] : [])], { stdio: "inherit" });
	execFileSync("node", ["tools/check-adaptive.mjs", "widgets", ...(process.env.WG_VAULT ? [WIDGETS] : [])], { stdio: "inherit" });
	execFileSync("node", ["tools/check-overrides.mjs", "styles.css"], { stdio: "inherit" });
	execFileSync("node", ["tools/check-one-law.mjs", "src"], { stdio: "inherit" });
} catch {
	process.exit(1);
}

await esbuild.build({
	entryPoints: ["src/main.js"],
	bundle: true,
	outfile: "main.js",
	format: "cjs",
	platform: "browser",
	target: "es2020",
	external: ["obsidian", "electron"],
	jsxFactory: "h",
	jsxFragment: "Fragment",
	sourcemap: production ? false : "inline",
	minify: production,
	logLevel: "info",
});

