import { z } from "zod";
import type { Declaration } from "./declaration";
import type { ListOptions } from "./declared";
import type { SchemaOrShapes } from "./declared-types";

const SHAPE_KEYS = ["read", "create", "update", "other"];
const SHAPE_UNKNOWN = 'of() names "{key}", which is not a schema it reads — it takes read, create, update and other';
const SHAPE_WITHOUT_READ = "of() names no schema for reading — give read, or other for every verb not named";

export function schemasOf(given: SchemaOrShapes): Pick<Declaration, "schema" | "create" | "update"> {
	if (given instanceof z.ZodType) return { schema: given };
	return schemasOfShapes(given as Readonly<Record<string, z.ZodType | undefined>>);
}

export function listOptions<Held>(options: ListOptions<Held>) {
	return {
		...(options.where ? { where: options.where } : {}),
		...(options.sort ? { sort: options.sort } : {}),
		...(options.default ? { rows: options.default } : {}),
	};
}

function schemasOfShapes(
	shapes: Readonly<Record<string, z.ZodType | undefined>>,
): Pick<Declaration, "schema" | "create" | "update"> {
	const unknownKey = Object.keys(shapes).find((key) => !SHAPE_KEYS.includes(key));
	if (unknownKey) throw new Error(SHAPE_UNKNOWN.replace("{key}", unknownKey));
	const read = shapes["read"] ?? shapes["other"];
	if (!read) throw new Error(SHAPE_WITHOUT_READ);
	const create = shapes["create"] ?? shapes["other"];
	const update = shapes["update"] ?? shapes["other"];
	return { schema: read, ...(create ? { create } : {}), ...(update ? { update } : {}) };
}
