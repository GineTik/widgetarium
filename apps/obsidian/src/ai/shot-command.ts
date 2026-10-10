import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { VAULT } from "./cli-paths.js";

export interface ShotAnswer {
	readonly path?: string;
	readonly refusal?: string;
}

const SHOTS = join(".widgetarium", "shots");
const WAIT_MS = 60000;
const NOT_ANSWERED =
	"Obsidian did not answer within a minute: it must be open on this vault, with the Widgetarium plugin on";
const SAID = "Open this picture to see {note} as a person sees it: {path}";
const LOOK_NEEDS = "--page needs --design <app>, and --frame needs --page <page>";

export async function shotOf(note: string, design: string, page: string, frame: string): Promise<ShotAnswer> {
	if ((page && !design) || (frame && !page)) return { refusal: LOOK_NEEDS };
	return design ? shotOfDesign(design, page, frame) : shotOfNote(note);
}

export async function shotOfNote(note: string): Promise<ShotAnswer> {
	return shotAsked({ note });
}

export async function shotOfDesign(app: string, page = "", frame = ""): Promise<ShotAnswer> {
	return shotAsked({ design: app, page, frame });
}

export function shotSaid(note: string, path: string): string {
	return SAID.replace("{note}", note).replace("{path}", path);
}

async function answerFor(id: string): Promise<ShotAnswer> {
	const png = join(VAULT, SHOTS, `${id}.png`);
	const failed = join(VAULT, SHOTS, `${id}.failed.txt`);
	const until = Date.now() + WAIT_MS;
	while (Date.now() < until) {
		if (existsSync(png)) return { path: png };
		if (existsSync(failed)) return { refusal: await readFailure(failed) };
		await new Promise((resolve) => setTimeout(resolve, 500));
	}
	return { refusal: NOT_ANSWERED };
}

async function readFailure(path: string): Promise<string> {
	const said = await readFile(path, "utf8");
	await rm(path, { force: true });
	return said;
}

async function shotAsked(asked: Readonly<Record<string, string>>): Promise<ShotAnswer> {
	const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
	await mkdir(join(VAULT, SHOTS, "requests"), { recursive: true });
	await writeFile(join(VAULT, SHOTS, "requests", `${id}.json`), JSON.stringify(asked));
	return answerFor(id);
}
