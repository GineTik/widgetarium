import { transform } from "sucrase";

const BUILD_DIR = "build";
export const BUILD_FILE = "widget.js";
const BUILT_SHEET = "widget.css";
export const SOURCE_FILES = ["widget.tsx", "widget.ts", "widget.jsx", "widget.js"];
export const SHEET_FILES = ["widget.css", "styles.css"];

export function buildFolder(folder) {
	return `${folder}/${BUILD_DIR}`;
}

export function builtCodePath(folder) {
	return `${buildFolder(folder)}/${BUILD_FILE}`;
}

export function builtSheetPath(folder) {
	return `${buildFolder(folder)}/${BUILT_SHEET}`;
}

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

export function sourceFileIn(files) {
	return SOURCE_FILES.find((name) => typeof files?.[name] === "string") ?? null;
}
