import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const BROWSERS = [
	process.env.WG_CHROME,
	"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
	"/Applications/Chromium.app/Contents/MacOS/Chromium",
	"/usr/bin/google-chrome",
	"/usr/bin/chromium",
].filter(Boolean);

export function findBrowser(gate) {
	for (const candidate of BROWSERS) {
		try {
			execFileSync(candidate, ["--version"], { stdio: "ignore" });
			return candidate;
		} catch {}
	}
	console.error(`${gate} gate: no Chrome found — set WG_CHROME to a Chromium binary`);
	process.exit(1);
}

export const WIDGETS_AT = ".widgetarium/widgets";

export function widgetFiles(from = "widgets") {
	const found = {};
	const walk = (at, to) => {
		for (const entry of fs.readdirSync(at, { withFileTypes: true })) {
			if (entry.isDirectory()) walk(path.join(at, entry.name), `${to}/${entry.name}`);
			else found[`${to}/${entry.name}`] = fs.readFileSync(path.join(at, entry.name), "utf8");
		}
	};
	walk(from, WIDGETS_AT);
	return found;
}
