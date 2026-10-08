import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { bundleOf, shoot, shotPage } from "./harness.ts";
import type { Theme } from "./harness.ts";

const THEMES: readonly Theme[] = ["light", "dark"];
const out = process.argv[2] ?? path.join(mkdtempSync(path.join(tmpdir(), "wg-kit-inputs-shot-")), "inputs");
const script = await bundleOf("tools/kit-inputs-shot-page.tsx");

const DEMO_CHROME = `<style>
.demo-page { box-sizing: border-box; max-width: 1240px; display: flex; flex-direction: column; gap: 24px;
	--wg-gap-cards: 24px; --wg-gap-items: 16px; --wg-gap-parts: 8px; }
</style>`;

for (const theme of THEMES) {
	const page = `${out}-${theme}.html`;
	writeFileSync(
		page,
		shotPage({
			theme,
			title: "Inputs, calendar, forms",
			lead: "the kit's shadcn inputs group",
			body: `${DEMO_CHROME}<script>${script}</script>`,
		}),
	);
	shoot(page, [`--screenshot=${out}-${theme}.png`], { width: 1300, height: 2600 });
	console.log(`${out}-${theme}.png`);
	shoot(`${page}#open`, [`--screenshot=${out}-${theme}-open.png`], { width: 1300, height: 900 });
	console.log(`${out}-${theme}-open.png`);
}
