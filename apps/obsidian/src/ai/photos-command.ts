import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { WIDGETS_DIR } from "@widgetarium/core/paths.js";
import {
	designFolderOf,
	designPathOf,
	isSafeAppName,
	readDesign,
	screenPathOf,
	statesOf,
} from "@widgetarium/core/app-design.js";
import { rawBoardOfNote } from "./board-note.js";
import type { Told } from "./shape-command.js";

export const PHOTOS_FOLDER = "photos";
const PHOTOS_FILE = "photos.json";
const PHOTO_URL = /https:\/\/[^\s"'`)<>]+/g;
const DRAFT_WIDGET = /"widget":"(@draft\/[^"@]+)/g;
const EXTENSION_OF: Readonly<Record<string, string>> = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
	"image/avif": "avif",
	"image/gif": "gif",
};

const NO_APP = 'Name the app whose approved design to keep the photos of, for example: photos "Weekly review"';
const NO_CANVAS = "There is no design at {path} yet.";
const KEPT = "{count} photos kept in {folder} ({fresh} downloaded now){failed}. {map} maps each address to its file.";
const FAILED = "; not pictures or not reachable: {urls}";

export async function photosOfApp(vault: string, app: string | undefined): Promise<Told<Record<string, string>>> {
	if (!app || !isSafeAppName(app)) return { refusal: NO_APP };
	const text = await readFile(join(vault, designPathOf(app)), "utf8").catch(() => null);
	const read = text === null ? null : readDesign(text);
	if (!read?.design) return { refusal: read?.refusal ?? NO_CANVAS.replace("{path}", designPathOf(app)) };
	const urls = await photoUrlsIn(
		vault,
		app,
		read.design.screens.flatMap(statesOf).map((state) => state.file),
	);
	const folder = `${designFolderOf(app)}/${PHOTOS_FOLDER}`;
	await mkdir(join(vault, folder), { recursive: true });
	const kept = await keptPhotosIn(join(vault, folder));
	const fetched = await Promise.all(
		urls.map(async (url) => [url, kept.get(photoKeyOf(url)) ?? (await downloaded(vault, folder, url))] as const),
	);
	const map = Object.fromEntries(fetched.filter((pair): pair is readonly [string, string] => pair[1] !== null));
	await writeFile(join(vault, folder, PHOTOS_FILE), `${JSON.stringify(map, null, 2)}\n`);
	const failed = fetched.filter(([, file]) => file === null).map(([url]) => url);
	const fresh = fetched.filter(([url, file]) => file !== null && !kept.has(photoKeyOf(url))).length;
	const said = KEPT.replace("{count}", String(Object.keys(map).length))
		.replace("{folder}", folder)
		.replace("{fresh}", String(fresh))
		.replace("{failed}", failed.length === 0 ? "" : FAILED.replace("{urls}", failed.join(", ")))
		.replace("{map}", `${folder}/${PHOTOS_FILE}`);
	return { value: map, text: said };
}

export function photoKeyOf(url: string): string {
	return createHash("sha1").update(url).digest("hex").slice(0, 16);
}

async function photoUrlsIn(vault: string, app: string, screenFiles: readonly string[]): Promise<string[]> {
	const boards = await Promise.all(screenFiles.map((file) => rawBoardOfNote(vault, screenPathOf(app, file))));
	const drafts = new Set(
		boards.flatMap((board) => [...JSON.stringify(board ?? {}).matchAll(DRAFT_WIDGET)].map((found) => found[1] ?? "")),
	);
	const sources = await Promise.all([...drafts].map((draft) => draftSourceOf(vault, draft)));
	return [...new Set(sources.flatMap((source) => source.match(PHOTO_URL) ?? []))];
}

async function draftSourceOf(vault: string, draft: string): Promise<string> {
	const folder = join(vault, WIDGETS_DIR, draft);
	const names = await readdir(folder).catch(() => []);
	const sources = names.filter((name) => /\.(tsx?|css)$/.test(name));
	return (await Promise.all(sources.map((name) => readFile(join(folder, name), "utf8")))).join("\n");
}

async function keptPhotosIn(folder: string): Promise<Map<string, string>> {
	const names = await readdir(folder).catch(() => []);
	return new Map(names.filter((name) => name !== PHOTOS_FILE).map((name) => [name.replace(/\.[^.]+$/, ""), name]));
}

async function downloaded(vault: string, folder: string, url: string): Promise<string | null> {
	const response = await fetch(url).catch(() => null);
	const type = response?.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
	const extension = EXTENSION_OF[type];
	if (!response?.ok || !extension) return null;
	const file = `${photoKeyOf(url)}.${extension}`;
	await writeFile(join(vault, folder, file), Buffer.from(await response.arrayBuffer()));
	return file;
}
