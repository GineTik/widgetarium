import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { paged } from "./chrome-ask.ts";
import { commandAccordionTwinChecks } from "./twins-command-accordion-paint.ts";
import { dialogTwinChecks } from "./twins-dialog-paint.ts";
import { twinChecks } from "./twins-paint.ts";

const SHEET = readFileSync("apps/obsidian/styles.css", "utf8");
const FRAME = `<div class="wg-design-frame" style="width:600px">
	<div class="wg-design-top" id="title"><span class="wg-design-name">Shell · New idea</span></div>
	<div class="wg-design-screen" data-wg-overlay-root="" id="screen" style="min-height:400px">
		<div class="wg-kit-modal-layer is-scoped" id="overlay">
			<div class="wg-kit-modal is-dialog" data-state="open" id="dialog" style="height:120px;transition:none"></div>
		</div>
	</div>
</div>`;
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><style>${SHEET}</style></head>
<body class="theme-light"><div class="wg-portal" style="padding:40px">${FRAME}</div><script>window.ready = true;</script></body></html>`;
const ASK = `(() => {
	const box = (id) => document.getElementById(id).getBoundingClientRect();
	const overlay = box("overlay");
	const screen = box("screen");
	const title = box("title");
	const dialog = box("dialog");
	return {
		coversScreen: overlay.top === screen.top && overlay.height === screen.height,
		coversTitle: overlay.top < title.bottom,
		dialogDrop: dialog.top - screen.top,
		dialogCentred: Math.abs(dialog.left + dialog.width / 2 - (screen.left + screen.width / 2)) < 1,
	};
})()`;

let failed = 0;
function check(what: string, got: unknown, wanted: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${what}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(wanted)}`}`,
	);
}

const file = path.join(mkdtempSync(path.join(tmpdir(), "wg-overlay-")), "overlay.html");
writeFileSync(file, PAGE);
const page = await paged(file, "window.ready === true", { size: [800, 700] });
check(
	"a dialog's scrim on a canvas screen covers that screen exactly and never the frame's title above it, and its panel stands centred 120px down it",
	await page.ask(ASK),
	{ coversScreen: true, coversTitle: false, dialogDrop: 120, dialogCentred: true },
);
page.close();
for (const [what, got, wanted] of await twinChecks()) check(what, got, wanted);
for (const [what, got, wanted] of await dialogTwinChecks()) check(what, got, wanted);
for (const [what, got, wanted] of await commandAccordionTwinChecks()) check(what, got, wanted);
console.log(`\n${failed === 0 ? "overlay paint: clean" : `overlay paint: ${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
