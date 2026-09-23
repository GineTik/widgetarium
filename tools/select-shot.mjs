import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { bundleOf, shoot, shotPage } from "./harness.mjs";

const THEMES = ["light", "dark"];
const out = process.argv[2] ?? path.join(mkdtempSync(path.join(tmpdir(), "wg-select-shot-")), "select");
const script = await bundleOf("tools/select-shot-page.jsx");

for (const theme of THEMES) {
	const page = `${out}-${theme}.html`;
	writeFileSync(
		page,
		shotPage({
			theme,
			title: "Select",
			lead: "open with a chosen item, and closed with a placeholder",
			body: `<script>${script}</script>`,
		}),
	);
	shoot(page, [`--screenshot=${out}-${theme}.png`], { width: 640, height: 420 });
	console.log(`${out}-${theme}.png`);
}
