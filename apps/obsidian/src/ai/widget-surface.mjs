import { readFile } from "node:fs/promises";
import { join } from "node:path";

const DECLARED = /export\s+declare\s+(?:const|function|class)\s+([A-Za-z_$][\w$]*)/g;
const PASSED_ON = /export\s+(?:type\s+)?\{([^}]+)\}/g;

export async function surfaceNamesIn(typesDir) {
	const at = join(typesDir, "widgetarium.d.ts");
	const declared = await readFile(at, "utf8").catch(() => null);
	if (declared === null) return null;
	const stated = [...declared.matchAll(DECLARED)].map((found) => found[1]);
	const passedOn = [...declared.matchAll(PASSED_ON)]
		.flatMap((found) => found[1].split(","))
		.map((entry) =>
			entry
				.trim()
				.replace(/^type\s+/, "")
				.split(/\s+as\s+/)
				.pop()
				.trim(),
		)
		.filter((name) => /^[A-Za-z_$][\w$]*$/.test(name));
	return [...new Set([...stated, ...passedOn])];
}
