import { pathToFileURL } from "node:url";
import { widgetFolders, writeCardBeside } from "./publish.ts";

export async function writeEveryCard(at = "registry"): Promise<string[]> {
	const unread: string[] = [];
	for (const folder of widgetFolders(at)) if (await writeCardBeside(folder)) unread.push(folder);
	return unread;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const unread = await writeEveryCard(process.argv[2] ?? "registry");
	if (unread.length > 0) {
		console.error(
			`\n!!  ${unread.length} widgets could not be read, so their cards were not written:\n${unread.join("\n")}`,
		);
		process.exit(1);
	}
}
