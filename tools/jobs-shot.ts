import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { bundleOf, shoot, shotPage } from "./harness.ts";
import type { Theme } from "./harness.ts";

const THEMES: readonly Theme[] = ["light", "dark"];
const out = process.argv[2] ?? path.join(mkdtempSync(path.join(tmpdir(), "wg-jobs-shot-")), "jobs");
const script = await bundleOf("tools/jobs-shot-page.tsx");

for (const theme of THEMES) {
	const page = `${out}-${theme}.html`;
	writeFileSync(
		page,
		shotPage({
			theme,
			title: "Jobs on the canvas",
			lead: "a page's job in place of the page, the tab dots, and the Jobs tab",
			body: `<script>${script}</script>`,
		}),
	);
	shoot(page, [`--screenshot=${out}-${theme}.png`], { width: 1400, height: 1500 });
	console.log(`${out}-${theme}.png`);
}
