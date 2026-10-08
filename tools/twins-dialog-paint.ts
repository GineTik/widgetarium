import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { paged, waited } from "./chrome-ask.ts";
import { bundleOf, THEMES } from "./harness.ts";

type TwinCheck = readonly [string, unknown, unknown];

const SETTLE_MS = 600;

const HOST = `--font-interface: "Helvetica Neue", Helvetica, Arial, sans-serif; --font-text: var(--font-interface);
	--font-ui-smaller: 12px; --font-ui-small: 14px; --font-ui-medium: 16px; --font-semibold: 600;`;

const ASK = `(() => {
	const panel = document.querySelector('[role="dialog"]');
	const scrim = document.querySelector('[data-slot="dialog-overlay"]');
	if (!panel || !scrim) return null;
	const drawn = getComputedStyle(panel);
	const box = panel.getBoundingClientRect();
	return {
		width: box.width,
		drop: box.top,
		centred: Math.abs(box.left + box.width / 2 - innerWidth / 2) < 1,
		padding: drawn.padding,
		radius: drawn.borderRadius,
		background: drawn.backgroundColor,
		shadow: drawn.boxShadow,
		motion: [drawn.transitionDuration, getComputedStyle(scrim).transitionDuration],
		scrim: getComputedStyle(scrim).backgroundColor,
	};
})()`;

const BEFORE_THE_MIGRATION = {
	padding: "24px",
	radius: "14px",
	background: "color(srgb 1 1 1)",
	shadow: "rgba(0, 0, 0, 0.06) 0px 1px 3px 0px, rgba(0, 0, 0, 0.06) 0px 6px 16px 0px",
	motion: ["0s", "0s"],
	scrim: "rgba(0, 0, 0, 0.22)",
};

function twinPage(script: string): string {
	return `<!doctype html><html><head><meta charset="utf-8">
<style>${readFileSync("apps/obsidian/styles.css", "utf8")}</style>
<style>body { margin: 0; ${THEMES.light} ${HOST} background: var(--background-primary); }</style>
</head><body class="wg-root theme-light"><div id="host"></div><script>${script}</script>
<script>window.ready = true;</script></body></html>`;
}

async function drawnDialog(file: string): Promise<unknown> {
	const page = await paged(file, "window.ready === true", { size: [1200, 800] });
	await waited(SETTLE_MS);
	const drawn = await page.ask(ASK);
	page.close();
	return drawn;
}

export async function dialogTwinChecks(): Promise<readonly TwinCheck[]> {
	const file = path.join(mkdtempSync(path.join(tmpdir(), "wg-dialog-twin-")), "dialog.html");
	writeFileSync(file, twinPage(await bundleOf("tools/twins-dialog-page.tsx")));
	const wide = await drawnDialog(file);
	const small = await drawnDialog(`${file}#small`);
	return [
		[
			"a Dialog wears the look it had before the shadcn migration: 560px of content in 24px of padding, 12vh down, centred, the raise plate, its corner and shadow, the scrim, and no motion",
			wide,
			{ width: 608, drop: 96, centred: true, ...BEFORE_THE_MIGRATION },
		],
		[
			"a small Dialog is 420px of content in the same padding, as before the migration",
			small,
			{ width: 468, drop: 96, centred: true, ...BEFORE_THE_MIGRATION },
		],
	];
}
