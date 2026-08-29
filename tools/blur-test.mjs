// DOES THE GLASS ACTUALLY BLUR? A computed backdrop-filter proves the rule was written, never
// that it had anything to sample: an ancestor carrying a backdrop-filter of its own becomes a
// BACKDROP ROOT, and every blur inside it then samples a flat surface and smears nothing. The
// computed style is identical in both cases, which is why this measures PIXELS instead — hard
// stripes behind the glass have to come back soft.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const CHROME = process.env.WG_CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const work = mkdtempSync(path.join(tmpdir(), "wg-blur-"));
const SHELL = readFileSync("styles.css", "utf8");

const HEAD = `<style>${SHELL}</style><style>
body { margin: 0; --background-primary: #ffffff; --background-secondary: #f6f6f6; --text-normal: #222222;
  --text-muted: #707070; --text-faint: #ababab; --interactive-accent: #6d4ee0; --background-modifier-border: #e4e4e4; }
.stripes { position: fixed; inset: 0; background: repeating-linear-gradient(90deg, #000 0 8px, #fff 8px 16px); }
.probe { position: fixed; left: 120px; top: 120px; width: 240px; height: 240px; }
</style>`;

function shotOf(name, inner) {
	const file = path.join(work, `${name}.html`);
	writeFileSync(file, `<!doctype html><html><head><meta charset="utf-8">${HEAD}</head><body class="wg-root"><div class="stripes"></div>${inner}</body></html>`);
	const png = path.join(work, `${name}.png`);
	execFileSync(CHROME, ["--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
		"--window-size=600,600", "--virtual-time-budget=4000", `--screenshot=${png}`, `file://${file}`], { stdio: "ignore" });
	return png;
}

const swingAt = (png, y, x0, x1) =>
	Number(execFileSync("/usr/bin/python3", ["tools/png-band.py", png, String(y), String(x0), String(x1)], { encoding: "utf8" }).trim());

// three pages, one band: bare stripes, glass on its own, and glass inside the window's overlay
const bare = shotOf("bare", "");
const alone = shotOf("alone", `<aside class="wg-set-panel wg-kit-glass probe"></aside>`);
const inWindow = shotOf(
	"inwindow",
	`<div class="wg-dialog-overlay wg-set-over" style="position:fixed;inset:0">
		<div class="wg-set-window" style="inset:60px"><aside class="wg-set-panel wg-kit-glass probe"></aside></div>
	</div>`,
);

const BAND = [240, 160, 320];
const bareSwing = swingAt(bare, ...BAND);
const aloneSwing = swingAt(alone, ...BAND);
const windowSwing = swingAt(inWindow, ...BAND);

let failed = 0;
const check = (label, got, want) => {
	const ok = String(got) === String(want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK " : "!! "} ${label}${ok ? "" : `  got ${got}, want ${want}`}`);
};

console.log(`   stripes swing ${bareSwing} bare · ${aloneSwing} under glass alone · ${windowSwing} under glass in the window\n`);
check("the stripes are hard with nothing over them", bareSwing > 200, true);
check("glass on its own really softens them", aloneSwing < bareSwing / 3, true);
// THE ONE THAT MATTERS: the panel lives inside the settings window, and that is where a person
// reads it. Blur that only works in isolation is blur nobody ever sees.
check("and it still softens them inside the settings window", windowSwing < bareSwing / 3, true);

console.log(failed ? `\n${failed} — the glass is not blurring what a person actually looks at` : "\nthe glass really blurs what is behind it");
process.exit(failed ? 1 : 0);
