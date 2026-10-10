import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { paged } from "./chrome-ask.ts";

const SHEET = readFileSync("apps/obsidian/styles.css", "utf8");
const LEAVES = `<div class="workspace-leaf-content" data-type="widgetarium-studio">
	<div class="view-header" id="studio-header">Farm</div>
	<div class="view-content wg-studio-view"></div>
</div>
<div class="workspace-leaf-content" data-type="markdown">
	<div class="view-header" id="note-header">Note</div>
</div>`;
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><style>${SHEET}</style></head>
<body class="theme-light">${LEAVES}<script>window.ready = true;</script></body></html>`;
const ASK_DISPLAYS = `(() => {
	const shown = (id) => getComputedStyle(document.getElementById(id)).display;
	const desktop = [shown("studio-header"), shown("note-header")];
	document.body.classList.add("is-mobile");
	const mobile = [shown("studio-header"), shown("note-header")];
	return { desktop, mobile };
})()`;

let failed = 0;
function check(what: string, got: unknown, wanted: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "OK  " : "!!  "}${what}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(wanted)}`}`,
	);
}

const file = path.join(mkdtempSync(path.join(tmpdir(), "wg-studio-header-")), "header.html");
writeFileSync(file, PAGE);
const page = await paged(file, "window.ready === true", { size: [800, 600] });
check(
	"a studio leaf hides Obsidian's header on desktop and keeps it on mobile, and a note's header always stands",
	await page.ask(ASK_DISPLAYS),
	{ desktop: ["none", "block"], mobile: ["block", "block"] },
);
page.close();
console.log(`\n${failed === 0 ? "studio header paint: clean" : `studio header paint: ${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
