import type { CatalogueArgs } from "./cli-args.js";
import type { CliOutput } from "./cli-output.js";
import { registryPlacesFor } from "./catalogue-places.js";
import { entryById, readCatalogue, type Catalogue, type CatalogueEntry } from "./catalogue-read.js";
import { rankedEntries } from "./catalogue-search.js";
import { cardText, rowsText } from "./catalogue-text.js";
import { cardViewOf, rowViewOf } from "./catalogue-views.js";
import { projectAbove } from "./project-root.js";
import { widgetSourcesOf } from "./widget-sources.js";

export async function runCatalogue(args: CatalogueArgs, output: CliOutput, cwd: string): Promise<number> {
	const places = registryPlacesFor({ asked: args.registry, cwd, project: await projectAbove(cwd) });
	const catalogue = await readCatalogue(places);
	if (args.action === "show") return showWidget(entryById(catalogue, args.id), args.json, output);
	const listed = args.action === "search" ? rankedEntries(catalogue.entries, args.words) : unranked(catalogue);
	return printRows(catalogue, listed, { json: args.json, output });
}

interface Printing {
	readonly json: boolean;
	readonly output: CliOutput;
}

interface Listed {
	readonly entry: CatalogueEntry;
	readonly score: number | null;
}

function unranked(catalogue: Catalogue): Listed[] {
	return catalogue.entries.map((entry) => ({ entry, score: null }));
}

function printRows(catalogue: Catalogue, listed: readonly Listed[], { json, output }: Printing): number {
	const rows = listed.map(({ entry, score }) => ({ ...rowViewOf(entry), ...(score === null ? {} : { score }) }));
	output.out(
		json ? jsonText({ registries: catalogue.registries, widgets: rows }) : rowsText(rows, catalogue.registries),
	);
	return catalogue.registries.every(({ refusal }) => refusal !== null) ? 1 : 0;
}

async function showWidget(entry: CatalogueEntry, json: boolean, output: CliOutput): Promise<number> {
	const view = cardViewOf(entry, await widgetSourcesOf(entry));
	output.out(json ? jsonText(view) : cardText(view));
	return 0;
}

function jsonText(value: object): string {
	return JSON.stringify(value, null, "\t");
}
