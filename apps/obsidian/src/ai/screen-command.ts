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
	'Name the app and the screen, for example: screen "Weekly review" "Inbox" --widget @weekly-review/inbox-page --set state=empty';
const NO_WIDGET = "Name the page widget that draws this screen with --widget @<app>/<page>-page.";
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
	const place = placeOf(screen.trim(), asked["state"]);
	if (asked["board"] === true) return placeBoard(vault, app, place);
	return placeDraft(vault, app, place, asked);
}

interface ScreenPlace {
	readonly screen: string;
	readonly state: string | undefined;
	readonly file: string;
}

function placeOf(screen: string, state: unknown): ScreenPlace {
	const named = typeof state === "string" && state.trim() !== "" ? state.trim() : undefined;
	return { screen, state: named, file: screenFileOf(screen, named) };
}

async function placeDraft(
	vault: string,
	app: string,
	place: ScreenPlace,
	asked: Readonly<Record<string, unknown>>,
): Promise<Told<string>> {
	const draft = draftOf(asked);
	if (draft.refusal !== undefined) return draft;
	const placed = await placeOnCanvas(vault, app, place);
	if (placed.refusal !== undefined) return placed;
	await writeWithFolder(join(vault, screenPathOf(app, place.file)), screenNoteOf(draft.widget, draft.values));
	await placed.write();
	return { value: place.file, text: draftPlacedText(app, place, draft.widget) };
}

function draftPlacedText(app: string, place: ScreenPlace, widget: string): string {
	return WRITTEN.replace("{file}", place.file)
		.replace("{widget}", widget)
		.replaceAll("{app}", app)
		.replace("{where}", whereOf(place));
}

type Draft =
	| { readonly refusal: string }
	| { readonly refusal?: undefined; readonly widget: string; readonly values: Record<string, string> };

function draftOf(asked: Readonly<Record<string, unknown>>): Draft {
	const widget = asked["widget"];
	if (typeof widget !== "string" || !widget.startsWith("@")) return { refusal: NO_WIDGET };
	const values = valuesIn(asked["set"]);
	if (values === null) return { refusal: BAD_SET };
	return { widget, values };
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

type CanvasPlacing =
	{ readonly refusal: string } | { readonly refusal?: undefined; readonly write: () => Promise<void> };

async function placeOnCanvas(vault: string, app: string, place: ScreenPlace): Promise<CanvasPlacing> {
	const canvasPath = join(vault, designPathOf(app));
	const held = await readFile(canvasPath, "utf8").catch(() => null);
	const written = withScreenAdded(held, place.screen, place.state, place.file);
	const read = readDesign(written);
	if (read.refusal !== undefined) return { refusal: REFUSED.replace("{why}", read.refusal) };
	return { write: () => writeWithFolder(canvasPath, written) };
}

async function writeWithFolder(path: string, text: string): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, text);
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
