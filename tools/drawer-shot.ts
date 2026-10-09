import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { DRAWER_PAGE_SIZE, drawerPageFile, drawn, shownPanel } from "./drawer-paint.ts";
import type { Theme } from "./harness.ts";

const THEME_ORDER: readonly Theme[] = ["light", "dark"];
const SETTLE_MS = 700;
const out = path.resolve(process.argv[2] ?? mkdtempSync(path.join(tmpdir(), "wg-drawer-shots-")));

async function shot(page: AskedPage, name: string): Promise<void> {
	const png = path.join(out, `${name}.png`);
	writeFileSync(png, await page.shoot());
	console.log(png);
}

for (const theme of THEME_ORDER) {
	const page = await paged(await drawerPageFile(theme), "window.ready === true", { size: DRAWER_PAGE_SIZE });
	await shownPanel(page, "sheet");
	await shot(page, `sheet-${theme}`);
	const low = await shownPanel(page, "drawer");
	await shot(page, `drawer-0.4-${theme}`);
	await page.press(...(low.grip ?? [0, 0]));
	await waited(SETTLE_MS);
	await drawn(page);
	await shot(page, `drawer-0.75-${theme}`);
	await shownPanel(page, "plain");
	await shot(page, `drawer-plain-${theme}`);
	page.close();
}
