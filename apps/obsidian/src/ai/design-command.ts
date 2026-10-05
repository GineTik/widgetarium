import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
	designPathOf,
	isSafeAppName,
	readDesign,
	referencePathOf,
	screenPathOf,
	statesOf,
	vaultBindingOf,
} from "@widgetarium/core/app-design.js";
import { rawBoardOfNote } from "./board-note.js";
import type { Design } from "@widgetarium/core/app-design.js";
import type { Told } from "./shape-command.js";

const NO_APP = 'Name the app whose design to show, for example: design "Weekly review"';
const NO_CANVAS = "There is no design at {path}: write it first, as the handbook's design.md says.";
const REFUSED = "The design at {path} does not fit: {why}";
const SCREEN_UNREADABLE = "Screen {name} ({path}) holds no widgetarium board that can be read.";
const TOUCHES_VAULT =
	"{name} ({path}) binds a prop to the vault ({binding}): a design shows sample rows only, as @core/typed-rows or @core/typed-value, so drawing it writes and reads nothing real";
const SCREEN_EMPTY =
	"Screen {name} ({path}) places no widget, so it draws nothing: write it with `screen`, naming the draft that draws it.";
const SHOWN = "{app}: {count} screens — {names}. The person sees it in the chat; wait for Approve design.";
const NO_SCREENS = "The design at {path} holds references only: draw at least one screen before showing it.";
const REFERENCES_SAID =
	"\nReferences the person put on the canvas — open each picture and copy its layout, type and use of photos: {paths}";

export async function designOfApp(vault: string, app: string | undefined): Promise<Told<Design>> {
	if (!app || !isSafeAppName(app)) return { refusal: NO_APP };
	const path = designPathOf(app);
	const text = await readFile(join(vault, path), "utf8").catch(() => null);
	if (text === null) return { refusal: NO_CANVAS.replace("{path}", path) };
	const read = readDesign(text);
	if (read.refusal !== undefined) return { refusal: REFUSED.replace("{path}", path).replace("{why}", read.refusal) };
	if (read.design.screens.length === 0) return { refusal: NO_SCREENS.replace("{path}", path) };
	for (const screen of read.design.screens) {
		for (const state of statesOf(screen)) {
			const refusal = await screenRefusal(vault, screenPathOf(app, state.file), `${screen.name} · ${state.name}`);
			if (refusal) return { refusal };
		}
	}
	const names = read.design.screens.map((screen) => screen.name).join(", ");
	const said = SHOWN.replace("{app}", app)
		.replace("{count}", String(read.design.screens.length))
		.replace("{names}", names);
	const references = read.design.references.map((reference) =>
		"url" in reference ? reference.url : referencePathOf(app, reference.file),
	);
	const listed = references.length === 0 ? "" : REFERENCES_SAID.replace("{paths}", references.join(", "));
	return { value: read.design, text: `${said}${listed}` };
}

async function screenRefusal(vault: string, at: string, name: string): Promise<string | null> {
	const board = await rawBoardOfNote(vault, at);
	if (board === null) return SCREEN_UNREADABLE.replace("{name}", name).replace("{path}", at);
	if (!hasWidget(board)) return SCREEN_EMPTY.replace("{name}", name).replace("{path}", at);
	const binding = vaultBindingOf(board);
	return binding ? TOUCHES_VAULT.replace("{name}", name).replace("{path}", at).replace("{binding}", binding) : null;
}

function hasWidget(board: unknown): boolean {
	const tiles: unknown = typeof board === "object" && board !== null ? Reflect.get(board, "tiles") : null;
	return (
		Array.isArray(tiles) &&
		tiles.some((tile) => typeof tile === "object" && tile !== null && typeof Reflect.get(tile, "widget") === "string")
	);
}
