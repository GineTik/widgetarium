import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { copyFiles } from "./template-files.js";

const KIT_SOURCE = "src";
const KIT_THEME = "theme.css";
const KIT_MODULE = /\.tsx?$/;
const KIT_PACKAGE = "@widgetarium/kit";
const SOURCE_PREFIX = /^\.\/(?:src\/)?/;

const KitExportsSchema = z.object({
	exports: z.record(z.string(), z.union([z.string(), z.object({ source: z.string() })])),
});

export function copyKit(kitRoot: string, target: string): void {
	copyFiles(path.join(kitRoot, KIT_SOURCE), target, isKitModule);
	fs.copyFileSync(path.join(kitRoot, KIT_THEME), path.join(target, KIT_THEME));
}

export function kitAliasesOf(kitRoot: string, kitPath: string): Record<string, string> {
	const manifest: unknown = JSON.parse(fs.readFileSync(path.join(kitRoot, "package.json"), "utf8"));
	const { exports } = KitExportsSchema.parse(manifest);
	return Object.fromEntries(
		Object.entries(exports).map(([subpath, target]) => {
			const source = typeof target === "string" ? target : target.source;
			return [`${KIT_PACKAGE}${subpath.slice(1)}`, `${kitPath}/${source.replace(SOURCE_PREFIX, "")}`];
		}),
	);
}

function isKitModule(relative: string): boolean {
	return KIT_MODULE.test(relative);
}
