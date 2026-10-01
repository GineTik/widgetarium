import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const CHROME = process.env["WG_CHROME"] ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const work = mkdtempSync(path.join(tmpdir(), "wg-blur-"));
const SHELL = readFileSync("apps/obsidian/styles.css", "utf8");

const HEAD = `<style>${SHELL}</style><style>
body { margin: 0; --background-primary: #ffffff; --background-secondary: #f6f6f6; --text-normal: #222222;
  --text-muted: #707070; --text-faint: #ababab; --interactive-accent: #6d4ee0; --background-modifier-border: #e4e4e4; }
.stripes { position: fixed; inset: 0; background: repeating-linear-gradient(90deg, #000 0 8px, #fff 8px 16px); }
.probe { position: fixed; left: 120px; top: 120px; width: 240px; height: 240px; }
</style>`;

function shotOf(name: string, inner: string): string {
	const file = path.join(work, `${name}.html`);
	writeFileSync(
		file,
		`<!doctype html><html><head><meta charset="utf-8">${HEAD}</head><body class="wg-root"><div class="stripes"></div>${inner}</body></html>`,
	);
	const png = path.join(work, `${name}.png`);
	execFileSync(
		CHROME,
		[
			"--headless",
			"--disable-gpu",
			"--no-sandbox",
			"--hide-scrollbars",
			"--window-size=600,600",
			"--virtual-time-budget=4000",
			`--screenshot=${png}`,
			`file://${file}`,
		],
		{ stdio: "ignore" },
	);
	return png;
}

type Band = readonly [y: number, x0: number, x1: number];

const swingAt = (png: string, [y, x0, x1]: Band): number =>
	Number(
		execFileSync("/usr/bin/python3", ["tools/png-band.py", png, String(y), String(x0), String(x1)], {
			encoding: "utf8",
		}).trim(),
	);

const bare = shotOf("bare", "");
const alone = shotOf("alone", `<aside class="wg-set-panel wg-kit-glass probe"></aside>`);
const inWindow = shotOf(
	"inwindow",
	`<div class="wg-dialog-overlay wg-set-over" style="position:fixed;inset:0">
		<div class="wg-set-window" style="inset:60px"><aside class="wg-set-panel wg-kit-glass probe"></aside></div>
	</div>`,
);

const BAND: Band = [240, 160, 320];
const bareSwing = swingAt(bare, BAND);
const aloneSwing = swingAt(alone, BAND);
const windowSwing = swingAt(inWindow, BAND);

function same(got: unknown, want: unknown): boolean {
	if (Object.is(got, want)) return true;
	if (!plain(got) || !plain(want)) return false;
	return JSON.stringify(got) === JSON.stringify(want);
}
function plain(value: unknown): boolean {
	if (value === null || typeof value !== "object") return false;
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === Array.prototype || proto === null;
}
function show(value: unknown): string {
	return plain(value) ? JSON.stringify(value) : String(value);
}
let failed = 0;
const check = (label: string, got: unknown, want: unknown): void => {
	const ok = same(got, want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK " : "!! "} ${label}${ok ? "" : `  got ${show(got)}, want ${show(want)}`}`);
};

console.log(
	`   stripes swing ${bareSwing} bare · ${aloneSwing} under glass alone · ${windowSwing} under glass in the window\n`,
);
check("the stripes are hard with nothing over them", bareSwing > 200, true);
check("glass on its own really softens them", aloneSwing < bareSwing / 3, true);
check("and it still softens them inside the settings window", windowSwing < bareSwing / 3, true);

console.log(
	failed
		? `\n${failed} — the glass is not blurring what a person actually looks at`
		: "\nthe glass really blurs what is behind it",
);
process.exit(failed ? 1 : 0);
