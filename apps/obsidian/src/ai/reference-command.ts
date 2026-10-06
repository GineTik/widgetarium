import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
	NOTE_TONES,
	REFERENCE_KINDS,
	designPathOf,
	isSafeAppName,
	readDesign,
	withReferenceNoted,
	withReferencesAdded,
} from "@widgetarium/core/app-design.js";
import type { Told } from "./shape-command.js";

const NO_APP = 'Name the app and the picture, for example: reference "Weekly review" https://… --why "the photo hero"';
const NO_URL = "Give the picture's https address: the image itself, not the page it stands on.";
const REFUSED = "That reference does not fit: {why}";
const ADDED = "{url} is on the {app} canvas{why}. The person sees it above the screens.";
const NO_NOTE =
	'Name the app, the reference and the note, for example: note "Weekly review" dex-home.png "Take the greeting with a composer as the hero" --tone take --at 0.4,0.2';
const NO_REFERENCE = "{app} has no reference named {named}: run `reference` first.";
const BAD_AT = "--at is two numbers from 0 to 1 split by a comma, the point the note is about: --at 0.4,0.2";
const NOTED = "The note stands beside {named} on the {app} canvas.";

type CommandFlags = Readonly<Record<string, unknown>>;

export async function referenceOfApp(
	vault: string,
	app: string | undefined,
	url: unknown,
	flags: CommandFlags,
): Promise<Told<string>> {
	if (!app || !isSafeAppName(app)) return { refusal: NO_APP };
	if (typeof url !== "string" || url.trim() === "") return { refusal: NO_URL };
	const entry = referenceEntryOf(url, flags);
	const path = join(vault, designPathOf(app));
	const written = withReferencesAdded(await readFile(path, "utf8").catch(() => null), [entry]);
	const refusal = await writeValidDesign(path, written);
	if (refusal !== null) return { refusal };
	return { value: entry.url, text: addedSaidOf(app, entry) };
}

export async function noteOfApp(
	vault: string,
	app: string | undefined,
	words: readonly unknown[],
	flags: CommandFlags,
): Promise<Told<string>> {
	const asked = askedNoteOf(app, words, flags);
	if ("refusal" in asked) return { refusal: asked.refusal };
	const path = join(vault, designPathOf(asked.app));
	const written = withReferenceNoted(await readFile(path, "utf8").catch(() => "{}"), asked.named, asked.note);
	if (written === null) return { refusal: NO_REFERENCE.replace("{app}", asked.app).replace("{named}", asked.named) };
	const refusal = await writeValidDesign(path, written);
	if (refusal !== null) return { refusal };
	return { value: asked.named, text: NOTED.replace("{named}", asked.named).replace("{app}", asked.app) };
}

interface AskedNote {
	readonly app: string;
	readonly named: string;
	readonly note: Exclude<ReturnType<typeof noteOf>, null>;
}

function referenceEntryOf(url: string, { why, kind }: CommandFlags) {
	return {
		url: url.trim(),
		...(typeof why === "string" && why.trim() !== "" ? { why: why.trim() } : {}),
		...(isReferenceKind(kind) ? { kind } : {}),
	};
}

function addedSaidOf(app: string, entry: { readonly url: string; readonly why?: string }): string {
	return ADDED.replace("{url}", entry.url)
		.replace("{app}", app)
		.replace("{why}", entry.why === undefined ? "" : ` — ${entry.why}`);
}

async function writeValidDesign(path: string, written: string): Promise<string | null> {
	const read = readDesign(written);
	if (read.refusal !== undefined) return REFUSED.replace("{why}", read.refusal);
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, written);
	return null;
}

function askedNoteOf(
	app: string | undefined,
	[named, text]: readonly unknown[],
	flags: CommandFlags,
): AskedNote | { readonly refusal: string } {
	if (!app || !isSafeAppName(app)) return { refusal: NO_NOTE };
	if (typeof named !== "string" || typeof text !== "string" || text.trim() === "") return { refusal: NO_NOTE };
	const note = noteOf(text, flags);
	if (note === null) return { refusal: BAD_AT };
	return { app, named, note };
}

function noteOf(text: string, { tone, at }: CommandFlags) {
	const point = pointOf(at);
	if (point === null) return null;
	return { text: text.trim(), tone: isNoteTone(tone) ? tone : "note", ...(point ? { at: point } : {}) };
}

function pointOf(at: unknown): readonly [number, number] | undefined | null {
	if (at === undefined) return undefined;
	const parts = String(at).split(",").map(Number);
	const [x, y] = parts;
	if (parts.length !== 2 || x === undefined || y === undefined) return null;
	return [x, y].every((part) => part >= 0 && part <= 1) ? [x, y] : null;
}

function isReferenceKind(held: unknown): held is (typeof REFERENCE_KINDS)[number] {
	return REFERENCE_KINDS.some((kind) => kind === held);
}

function isNoteTone(held: unknown): held is (typeof NOTE_TONES)[number] {
	return NOTE_TONES.some((tone) => tone === held);
}
