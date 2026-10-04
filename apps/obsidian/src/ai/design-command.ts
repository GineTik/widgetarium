import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
	designPathOf,
	isSafeAppName,
	readDesign,
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
const SHOWN = "{app}: {count} screens — {names}. The person sees it in the chat; wait for Approve design.";

export async function designOfApp(vault: string, app: string | undefined): Promise<Told<Design>> {
	if (!app || !isSafeAppName(app)) return { refusal: NO_APP };
	const path = designPathOf(app);
	const text = await readFile(join(vault, path), "utf8").catch(() => null);
	if (text === null) return { refusal: NO_CANVAS.replace("{path}", path) };
	const read = readDesign(text);
	if (read.refusal !== undefined) return { refusal: REFUSED.replace("{path}", path).replace("{why}", read.refusal) };
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
	return { value: read.design, text: said };
}

async function screenRefusal(vault: string, at: string, name: string): Promise<string | null> {
	const board = await rawBoardOfNote(vault, at);
	if (board === null) return SCREEN_UNREADABLE.replace("{name}", name).replace("{path}", at);
	const binding = vaultBindingOf(board);
	return binding ? TOUCHES_VAULT.replace("{name}", name).replace("{path}", at).replace("{binding}", binding) : null;
}
