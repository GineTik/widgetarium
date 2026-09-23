import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PACKAGE = "material-shapes-ts@0.3.0";
const OUT = path.join(process.cwd(), "packages", "kit", "assets", "shapes");

const work = mkdtempSync(path.join(tmpdir(), "wg-shapes-"));
writeFileSync(path.join(work, "package.json"), JSON.stringify({ name: "wg-shapes", private: true, type: "module" }));
execFileSync("npm", ["install", "--no-audit", "--no-fund", "--silent", PACKAGE], { cwd: work, stdio: "inherit" });

const entry = pathToFileURL(path.join(work, "node_modules", "material-shapes-ts", "dist", "index.js")).href;
const { MaterialShapes, roundedPolygonToPath } = await import(entry);

const kebab = (name) =>
	name
		.replace(/([a-z0-9])([A-Z])/g, "$1-$2")
		.replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
		.toLowerCase();

const shapes = {};
for (const name of Object.getOwnPropertyNames(MaterialShapes)) {
	if (typeof Object.getOwnPropertyDescriptor(MaterialShapes, name)?.get !== "function") continue;
	shapes[kebab(name)] = String(roundedPolygonToPath(MaterialShapes[name]));
}

mkdirSync(OUT, { recursive: true });
writeFileSync(path.join(OUT, "shapes.json"), `${JSON.stringify(shapes, null, "\t")}\n`);
console.log(`${Object.keys(shapes).length} shapes -> assets/shapes/shapes.json`);
