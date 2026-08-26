import esbuild from "esbuild";

const production = process.argv.includes("--prod");

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
