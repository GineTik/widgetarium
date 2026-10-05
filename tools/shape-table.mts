import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { shapeTableOf } from "./shape-points.mts";

const ASSETS = path.join(process.cwd(), "packages", "kit", "assets", "shapes", "shapes.json");
const TABLE = path.join(process.cwd(), "packages", "kit", "src", "shapes", "shape-table.ts");

const drawn: unknown = JSON.parse(readFileSync(ASSETS, "utf8"));
if (typeof drawn !== "object" || drawn === null) throw new Error(`${ASSETS} holds no shape outlines`);
const outlines = Object.fromEntries(
	Object.entries(drawn).filter((pair): pair is [string, string] => typeof pair[1] === "string"),
);
writeFileSync(TABLE, shapeTableOf(outlines));
console.log(`${Object.keys(outlines).length} shapes -> src/shapes/shape-table.ts`);
