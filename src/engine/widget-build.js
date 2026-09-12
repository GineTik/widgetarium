import { transform } from "sucrase";

export const BUILD_FILE = "widget.js";
export const SOURCE_FILES = ["widget.tsx", "widget.ts", "widget.jsx", "widget.js"];
export const SHEET_FILES = ["widget.css", "styles.css"];

export function compileWidget(source, filePath) {
	const typed = /\.tsx?$/.test(String(filePath ?? ""));
	return transform(source, {
		transforms: typed ? ["typescript", "jsx", "imports"] : ["jsx", "imports"],
		jsxPragma: "h",
		jsxFragmentPragma: "Fragment",
		production: true,
		filePath,
	}).code;
}

// TRADE-OFF: a source named like the build is left uncompiled, because one file cannot be both
export function sourceFileIn(files) {
	return SOURCE_FILES.find((name) => name !== BUILD_FILE && typeof files?.[name] === "string") ?? null;
}
