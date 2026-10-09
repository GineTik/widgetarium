import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { OBSIDIAN_STUB, bundleOf, shoot, shotPage } from "./harness.ts";
import type { Theme } from "./harness.ts";

const THEMES: readonly Theme[] = ["light", "dark"];
const TABS = ["Docs", "References", "Components", "Components/open"] as const;
const out = process.argv[2] ?? path.join(mkdtempSync(path.join(tmpdir(), "wg-kit-canvas-shot-")), "kit-canvas");
const script = await bundleOf("tools/kit-canvas-shot-page.tsx", [OBSIDIAN_STUB]);

for (const theme of THEMES) {
	const page = `${out}-${theme}.html`;
	writeFileSync(
		page,
		shotPage({
			theme,
			title: "Canvas tabs",
			lead: "the Docs, References and Components tabs on a zoomed canvas",
			body: `<script>${script}</script>`,
		}),
	);
	for (const tab of TABS) {
		const shot = `${out}-${theme}-${tab.replace("/", "-").toLowerCase()}.png`;
		shoot(`${page}#${tab}`, [`--screenshot=${shot}`], { width: 1400, height: 1600 });
		console.log(shot);
	}
}
