import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { designPathOf, isSafeAppName, readDesign, withReferencesAdded } from "@widgetarium/core/app-design.js";
import type { Told } from "./shape-command.js";

const NO_APP = 'Name the app and the picture, for example: reference "Weekly review" https://… --why "the photo hero"';
const NO_URL = "Give the picture's https address: the image itself, not the page it stands on.";
const REFUSED = "That reference does not fit: {why}";
const ADDED = "{url} is on the {app} canvas{why}. The person sees it above the screens.";

export async function referenceOfApp(
	vault: string,
	app: string | undefined,
	url: unknown,
	why: unknown,
): Promise<Told<string>> {
	if (!app || !isSafeAppName(app)) return { refusal: NO_APP };
	if (typeof url !== "string" || url.trim() === "") return { refusal: NO_URL };
	const entry = { url: url.trim(), ...(typeof why === "string" && why.trim() !== "" ? { why: why.trim() } : {}) };
	const path = join(vault, designPathOf(app));
	const held = await readFile(path, "utf8").catch(() => null);
	const written = withReferencesAdded(held, [entry]);
	const read = readDesign(written);
	if (read.refusal !== undefined) return { refusal: REFUSED.replace("{why}", read.refusal) };
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, written);
	const said = ADDED.replace("{url}", entry.url)
		.replace("{app}", app)
		.replace("{why}", "why" in entry ? ` — ${entry.why}` : "");
	return { value: entry.url, text: said };
}
