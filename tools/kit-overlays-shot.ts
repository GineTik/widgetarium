import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { bundleOf, shoot, THEMES } from "./harness.ts";
import type { Theme } from "./harness.ts";

const SHOTS: readonly string[] = ["floating", "sheet", "drawer", "alert", "toast"];
const THEME_ORDER: readonly Theme[] = ["light", "dark"];
const out = path.resolve(process.argv[2] ?? mkdtempSync(path.join(tmpdir(), "wg-overlay-shots-")));

const HOST = `--font-interface: "Helvetica Neue", Helvetica, Arial, sans-serif; --font-text: var(--font-interface);
	--font-monospace: "SF Mono", Menlo, Consolas, monospace;
	--font-ui-smaller: 12px; --font-ui-small: 14px; --font-ui-medium: 16px;
	--font-normal: 400; --font-medium: 500; --font-semibold: 600; --font-bold: 700;`;

const OPEN_THE_CONTEXT_MENU = `setTimeout(() => {
	const area = document.getElementById("demo-context-area");
	if (!area || location.hash !== "#open=floating") return;
	const box = area.getBoundingClientRect();
	area.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: box.left + 40, clientY: box.top + 30 }));
}, 600);`;

const script = await bundleOf("tools/kit-overlays-shot-page.tsx");

for (const theme of THEME_ORDER) {
	const page = `<!doctype html><html><head><meta charset="utf-8">
<style>${readFileSync("apps/obsidian/styles.css", "utf8")}</style>
<style>body { margin: 0; padding: 32px; ${THEMES[theme]} ${HOST} color-scheme: ${theme};
	background: var(--wg-kit-page); color: var(--wg-kit-text); font-family: var(--font-interface); }
:is(*) { transition: none !important; animation: none !important; }</style>
</head><body class="wg-root theme-${theme}"><div id="demo"></div>
<script>${script}</script><script>${OPEN_THE_CONTEXT_MENU}</script>
</body></html>`;
	const file = path.join(out, `${theme}.html`);
	writeFileSync(file, page);
	for (const shot of SHOTS) {
		const png = path.join(out, `overlays-${shot}-${theme}.png`);
		shoot(`${file}#open=${shot}`, [`--screenshot=${png}`], { width: 1400, height: 1000 });
		console.log(png);
	}
}
