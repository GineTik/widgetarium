import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CliRefusal } from "./cli-output.js";

export interface PackageLocations {
	readonly templates: string;
	readonly kit: string;
	readonly handbook: string;
	readonly repo: string | null;
}

const MANIFEST = "package.json";
const PROJECT_TEMPLATE = "templates/project";
const PACKED_HANDBOOK = "dist/handbook";
const REPO_HANDBOOK = "docs/ai";
const REPO_MARK = "tools/pack-engine.mts";
const KIT_THEME = "@widgetarium/kit/theme.css";

export function packageLocations(): PackageLocations {
	const packageRoot = ancestorHolding(path.dirname(fileURLToPath(import.meta.url)), MANIFEST);
	if (packageRoot === null) throw new Error("the widgetarium CLI runs outside any package");
	const repo = ancestorHolding(packageRoot, REPO_MARK);
	return {
		templates: path.join(packageRoot, PROJECT_TEMPLATE),
		kit: path.dirname(fileURLToPath(import.meta.resolve(KIT_THEME))),
		handbook: handbookIn(packageRoot, repo),
		repo,
	};
}

export function ancestorHolding(start: string, marker: string): string | null {
	if (fs.existsSync(path.join(start, marker))) return start;
	const parent = path.dirname(start);
	return parent === start ? null : ancestorHolding(parent, marker);
}

function handbookIn(packageRoot: string, repo: string | null): string {
	const candidates = [
		path.join(packageRoot, PACKED_HANDBOOK),
		...(repo === null ? [] : [path.join(repo, REPO_HANDBOOK)]),
	];
	const found = candidates.find((candidate) => fs.existsSync(candidate));
	if (found === undefined) throw new CliRefusal(`no handbook beside the CLI: looked in ${candidates.join(", ")}`);
	return found;
}
