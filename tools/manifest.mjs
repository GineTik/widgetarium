import { pathToFileURL } from "node:url";
import { widgetFolders, writeCardBeside } from "./publish.mjs";

export async function writeEveryCard(at = "registry") {
	for (const folder of widgetFolders(at)) await writeCardBeside(folder);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	await writeEveryCard(process.argv[2] ?? "registry");
}
