import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { bundleOf, shoot, shotPage } from "./harness.ts";
import type { Theme } from "./harness.ts";

const THEMES: readonly Theme[] = ["light", "dark"];
const out = process.argv[2] ?? path.join(mkdtempSync(path.join(tmpdir(), "wg-kit-canvas-shot-")), "kit-canvas");
const script = await bundleOf("tools/kit-canvas-shot-page.tsx");

for (const theme of THEMES) {
	const page = `${out}-${theme}.html`;
	writeFileSync(
		page,
		shotPage({
			theme,
			title: "Design system page",
			lead: "the rules on the left, the kit on the right, on a zoomed canvas",
			body: `<script>${script}</script>`,
		}),
	);
	shoot(page, [`--screenshot=${out}-${theme}.png`], { width: 1400, height: 1600 });
	console.log(`${out}-${theme}.png`);
	shoot(`${page}#open`, [`--screenshot=${out}-${theme}-open.png`], { width: 1400, height: 1600 });
	console.log(`${out}-${theme}-open.png`);
}
