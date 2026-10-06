import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
	designPathOf,
	isSafeAppName,
	readDesign,
	screenFileOf,
	screenNoteOf,
	screenPathOf,
	withScreenAdded,
} from "@widgetarium/core/app-design.js";
import type { Told } from "./shape-command.js";

const NO_APP =
	'Name the app and the screen, for example: screen "Weekly review" "Inbox" --widget @draft/review --set page=inbox';
const NO_WIDGET = "Name the draft that draws this screen with --widget @draft/<name>.";
const BAD_SET = 'Each --set is prop=value, several split by commas: --set "page=inbox,dialog=add"';
const REFUSED = "That screen does not fit the canvas: {why}";
const WRITTEN = "{file} drawn by {widget} is on the {app} canvas as {where}. Run `shot --design {app}` to see it.";
const NO_BOARD_NOTE =
	"--board places a screen note you wrote: write .widgetarium/apps/{app}/design/{file} as a widgetarium board first";
const BOARD_PLACED = "{file} is on the {app} canvas as {where}. Run `shot --design {app}` to see it.";

export async function screenOfApp(
	vault: string,
	app: string | undefined,
	screen: unknown,
	asked: Readonly<Record<string, unknown>>,
): Promise<Told<string>> {
	if (!app || !isSafeAppName(app) || typeof screen !== "string" || screen.trim() === "") return { refusal: NO_APP };
	const state = typeof asked["state"] === "string" && asked["state"].trim() !== "" ? asked["state"].trim() : undefined;
	const file = screenFileOf(screen.trim(), state);
	if (asked["board"] === true) return placeBoard(vault, app, { screen: screen.trim(), state, file });
	const widget = asked["widget"];
	if (typeof widget !== "string" || !widget.startsWith("@")) return { refusal: NO_WIDGET };
	const values = valuesIn(asked["set"]);
	if (values === null) return { refusal: BAD_SET };
	const placed = await placeOnCanvas(vault, app, { screen: screen.trim(), state, file });
	if (placed.refusal !== undefined) return placed;
	const notePath = join(vault, screenPathOf(app, file));
	await mkdir(dirname(notePath), { recursive: true });
	await writeFile(notePath, screenNoteOf(widget, values));
	await placed.write();
	const said = WRITTEN.replace("{file}", file)
		.replace("{widget}", widget)
		.replaceAll("{app}", app)
		.replace("{where}", whereOf({ screen: screen.trim(), state, file }));
	return { value: file, text: said };
}

interface ScreenPlace {
	readonly screen: string;
	readonly state: string | undefined;
	readonly file: string;
}

async function placeBoard(vault: string, app: string, place: ScreenPlace): Promise<Told<string>> {
	const note = await readFile(join(vault, screenPathOf(app, place.file)), "utf8").catch(() => null);
	if (note === null || !note.includes("```widgetarium"))
		return { refusal: NO_BOARD_NOTE.replace("{file}", place.file).replace("{app}", app) };
	const placed = await placeOnCanvas(vault, app, place);
	if (placed.refusal !== undefined) return placed;
	await placed.write();
	return {
		value: place.file,
		text: BOARD_PLACED.replace("{file}", place.file).replaceAll("{app}", app).replace("{where}", whereOf(place)),
	};
}

async function placeOnCanvas(
	vault: string,
	app: string,
	{ screen, state, file }: ScreenPlace,
): Promise<{ readonly refusal: string } | { readonly refusal?: undefined; readonly write: () => Promise<void> }> {
	const canvasPath = join(vault, designPathOf(app));
	const held = await readFile(canvasPath, "utf8").catch(() => null);
	const written = withScreenAdded(held, screen, state, file);
	const read = readDesign(written);
	if (read.refusal !== undefined) return { refusal: REFUSED.replace("{why}", read.refusal) };
	return {
		write: async () => {
			await mkdir(dirname(canvasPath), { recursive: true });
			await writeFile(canvasPath, written);
		},
	};
}

function whereOf({ screen, state }: ScreenPlace): string {
	return state ? `${screen} · ${state}` : screen;
}

function valuesIn(set: unknown): Record<string, string> | null {
	if (set === undefined || set === true) return {};
	if (typeof set !== "string") return null;
	const pairs = set.split(",").map((pair) => pair.split("=").map((part) => part.trim()));
	if (pairs.some((pair) => pair.length !== 2 || !pair[0])) return null;
	return Object.fromEntries(pairs.map(([prop, value]) => [propOf(prop ?? ""), value ?? ""]));
}

function propOf(name: string): string {
	return name.startsWith("get") ? name : `get${name.charAt(0).toUpperCase()}${name.slice(1)}`;
}
