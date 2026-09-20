import fs from "node:fs";
import path from "node:path";

// TODO: read the folder and source names from src/engine/widget-build.js once tools can import it as an ES module
const BUILT_INTO = "build";
const A_WIDGET_SOURCE = /^widget\.(jsx|tsx|js|ts)$/;

export function widgetFiles(dir) {
	const found = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (entry.name === BUILT_INTO) continue;

		const full = path.join(dir, entry.name);
		if (entry.isDirectory() || (entry.isSymbolicLink() && fs.statSync(full).isDirectory()))
			found.push(...widgetFiles(full));
		else if (A_WIDGET_SOURCE.test(entry.name)) found.push(full);
	}
	return found;
}
