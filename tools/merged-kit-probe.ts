import fs from "node:fs";
import path from "node:path";
import { mergeKit } from "../packages/cli/src/kit-copy.js";

export const KIT_FOLDER = "src/shared/kit";
export const COMPONENTS = "components/";

const KIT_SOURCE = path.resolve(import.meta.dirname, "../packages/kit/src");
const MODULE_EXTENSION = /\.tsx?$/;
const EXPORTED_DECLARATION = /^export (?:declare )?(?:async )?(?:function|const|let|class|interface|type|enum) (\w+)/gm;

export function filesIn(root: string): string[] {
	return fs
		.readdirSync(root, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile())
		.map((entry) => path.relative(root, path.join(entry.parentPath, entry.name)))
		.sort();
}

export function kitModulesInRepo(): string[] {
	return filesIn(KIT_SOURCE).filter(
		(at) => /\.tsx?$/.test(at) && !at.split(path.sep).some((part) => part.startsWith(".")),
	);
}

export function kitFilesIn(project: string): string[] {
	return filesIn(path.join(project, KIT_FOLDER));
}

export function componentNamesIn(files: readonly string[]): string[] {
	return files
		.filter((at) => at.startsWith(COMPONENTS))
		.map((at) => at.slice(COMPONENTS.length).replace(MODULE_EXTENSION, ""));
}

export function exportsInRepoOf(component: string): string[] {
	const parts = kitModulesInRepo().filter((at) => {
		const name = at.replace(MODULE_EXTENSION, "");
		return name === `${COMPONENTS}${component}` || name.startsWith(`${COMPONENTS}${component}-`);
	});
	return parts.flatMap((at) => exportedDeclarationsIn(fs.readFileSync(path.join(KIT_SOURCE, at), "utf8")));
}

export function missingFromMerged(project: string, file: string, names: readonly string[]): string[] {
	const merged = new Set(
		exportedDeclarationsIn(fs.readFileSync(path.join(project, KIT_FOLDER, COMPONENTS, file), "utf8")),
	);
	return names.filter((name) => !merged.has(name));
}

export function kitBytesIn(project: string): string[] {
	return kitFilesIn(project).map((at) => `${at}\n${fs.readFileSync(path.join(project, KIT_FOLDER, at), "utf8")}`);
}

export function collidingPartsRefusal(): string {
	try {
		mergeKit(
			new Map([
				["index.ts", 'export { Dial } from "./components/dial";\n'],
				["components/dial.ts", "const SIZE = 1;\nexport const Dial = SIZE;\n"],
				["components/dial-face.ts", "const SIZE = 2;\nexport const DialFace = SIZE;\n"],
			]),
		);
		return "";
	} catch (error) {
		return error instanceof Error ? error.message : String(error);
	}
}

function exportedDeclarationsIn(text: string): string[] {
	return [...text.matchAll(EXPORTED_DECLARATION)].flatMap((match) => match[1] ?? []);
}
