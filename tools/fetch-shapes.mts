import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

interface ShapesPackage {
	readonly MaterialShapes: object;
	readonly roundedPolygonToPath: (shape: unknown) => unknown;
}

const PACKAGE = "material-shapes-ts@0.3.0";
const OUT = path.join(process.cwd(), "packages", "kit", "assets", "shapes");

const work = mkdtempSync(path.join(tmpdir(), "wg-shapes-"));
writeFileSync(path.join(work, "package.json"), JSON.stringify({ name: "wg-shapes", private: true, type: "module" }));
execFileSync("npm", ["install", "--no-audit", "--no-fund", "--silent", PACKAGE], { cwd: work, stdio: "inherit" });

const entry = pathToFileURL(path.join(work, "node_modules", "material-shapes-ts", "dist", "index.js")).href;
const loaded: unknown = await import(entry);
if (!isShapesPackage(loaded)) throw new Error(`${PACKAGE} no longer exports MaterialShapes and roundedPolygonToPath`);
const { MaterialShapes, roundedPolygonToPath } = loaded;

const shapes: Record<string, string> = {};
for (const name of Object.getOwnPropertyNames(MaterialShapes)) {
	if (typeof Object.getOwnPropertyDescriptor(MaterialShapes, name)?.get !== "function") continue;
	const shape: unknown = Reflect.get(MaterialShapes, name);
	shapes[kebab(name)] = String(roundedPolygonToPath(shape));
}

mkdirSync(OUT, { recursive: true });
writeFileSync(path.join(OUT, "shapes.json"), `${JSON.stringify(shapes, null, "\t")}\n`);
console.log(`${Object.keys(shapes).length} shapes -> assets/shapes/shapes.json`);

function isShapesPackage(value: unknown): value is ShapesPackage {
	if (typeof value !== "object" || value === null) return false;
	if (!("MaterialShapes" in value) || !("roundedPolygonToPath" in value)) return false;
	return (
		typeof value.MaterialShapes === "object" &&
		value.MaterialShapes !== null &&
		typeof value.roundedPolygonToPath === "function"
	);
}

function kebab(name: string): string {
	return name
		.replace(/([a-z0-9])([A-Z])/g, "$1-$2")
		.replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
		.toLowerCase();
}
