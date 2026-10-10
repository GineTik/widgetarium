import { Platform, TFile } from "obsidian";
import type { App, Vault, WorkspaceLeaf } from "obsidian";
import { failureMessage } from "@widgetarium/core/engine/failure-message.js";
import type { HostApp, StudioHostPort } from "@widgetarium/core/engine/studio-host.js";
import { PROJECT_CONFIG_FILE, baseNameOf, readProjectConfig } from "@widgetarium/core/project/index.js";
import { discoverRoutes } from "@widgetarium/core/project/project-routes.js";
import { vaultProjectFiles } from "./project-files-vault.js";
import {
	appNotePathOf,
	appNoteText,
	chromeInsetsOf,
	foldersAlong,
	newAppFilesOf,
	numberedName,
	projectFoldersOf,
	studioNoteOf,
} from "./studio-note.js";
import type { WindowChrome, WindowSystem } from "./studio-note.js";

export interface StudioHostPlace {
	readonly app: App;
	readonly leaf: WorkspaceLeaf;
	readonly frame: HTMLElement;
	readonly viewType: string;
}

const NEW_APP = "Untitled app";
const MOST_UNTITLED_APPS = 1000;
const HIDDEN_FRAMELESS = "is-hidden-frameless";
const ALREADY_EXISTS = /already exists/i;
const OPEN_FAILED = "The app {id} did not open";
const CREATE_FAILED = "The new app was not created";
const NO_FREE_NAME = `every name from "${NEW_APP}" to "${NEW_APP} ${MOST_UNTITLED_APPS}" is taken`;

export function obsidianStudioHost(place: StudioHostPlace): StudioHostPort {
	return {
		insets: () => chromeInsetsOf(windowChromeOf(place.frame)),
		onInsets: (changed) => watchChrome(place.frame, changed),
		apps: () => vaultAppsOf(place.app),
		openApp: (id) => runReported(OPEN_FAILED.replace("{id}", id), () => openApp(place, id)),
		createApp: () => runReported(CREATE_FAILED, () => createApp(place)),
	};
}

function windowChromeOf(frame: HTMLElement): WindowChrome {
	const page = frame.ownerDocument;
	return {
		rect: frame.getBoundingClientRect(),
		innerWidth: page.defaultView?.innerWidth ?? 0,
		system: windowSystemOf(),
		isHiddenFrameless: page.body.classList.contains(HIDDEN_FRAMELESS),
	};
}

function windowSystemOf(): WindowSystem {
	if (Platform.isMacOS) return "mac";
	return Platform.isWin ? "windows" : "other";
}

function watchChrome(frame: HTMLElement, changed: () => void): () => void {
	const page = frame.ownerDocument;
	const observer = new ResizeObserver(() => changed());
	observer.observe(frame);
	observer.observe(page.body);
	page.defaultView?.addEventListener("resize", changed);
	return () => {
		observer.disconnect();
		page.defaultView?.removeEventListener("resize", changed);
	};
}

async function vaultAppsOf(app: App): Promise<readonly HostApp[]> {
	const folders = projectFoldersOf(app.vault.getFiles().map((file) => file.path));
	return Promise.all(folders.map((folder) => hostAppAt(app, folder)));
}

async function hostAppAt(app: App, folder: string): Promise<HostApp> {
	const files = vaultProjectFiles(app.vault.adapter, folder);
	const reading = await readProjectConfig(files);
	if ("refusal" in reading) return refusedAppAt(folder, `${PROJECT_CONFIG_FILE}: ${reading.refusal}`);
	const routes = await discoverRoutes(files, reading.config.paths.routes);
	return { id: folder, name: reading.config.app.name, pages: routes.length, firstPage: routes[0]?.path ?? null };
}

function refusedAppAt(folder: string, refusal: string): HostApp {
	console.warn(`[widgetarium] app ${folder} → refused: ${refusal}`);
	return { id: folder, name: baseNameOf(folder), pages: 0, firstPage: null, refusal };
}

async function openApp(place: StudioHostPlace, folder: string): Promise<void> {
	const note = noteNamingFolder(place.app, folder) ?? (await createdOrHeld(place.app.vault, folder));
	await place.leaf.setViewState({ type: place.viewType, state: { file: note.path }, active: true });
}

function noteNamingFolder(app: App, folder: string): TFile | null {
	const naming = app.vault
		.getMarkdownFiles()
		.find((file) => studioNoteOf(app.metadataCache.getFileCache(file)?.frontmatter)?.folder === folder);
	return naming ?? null;
}

async function createdOrHeld(vault: Vault, folder: string): Promise<TFile> {
	const path = appNotePathOf(folder);
	try {
		return await vault.create(path, appNoteText(folder));
	} catch (failure) {
		const held = isAlreadyExists(failure) ? vault.getAbstractFileByPath(path) : null;
		if (held instanceof TFile) return held;
		throw failure;
	}
}

async function createApp(place: StudioHostPlace): Promise<void> {
	const folder = await claimFreeFolder(place.app.vault);
	await layAppFiles(place.app.vault, folder);
	console.info(`[widgetarium] new app → ${folder}`);
	await openApp(place, folder);
}

async function claimFreeFolder(vault: Vault): Promise<string> {
	for (let count = 1; count <= MOST_UNTITLED_APPS; count += 1) {
		const folder = numberedName(NEW_APP, count);
		if (await isFolderClaimed(vault, folder)) return folder;
	}
	throw new Error(NO_FREE_NAME);
}

async function isFolderClaimed(vault: Vault, folder: string): Promise<boolean> {
	try {
		await vault.createFolder(folder);
		return true;
	} catch (failure) {
		if (isAlreadyExists(failure)) return false;
		throw failure;
	}
}

async function layAppFiles(vault: Vault, folder: string): Promise<void> {
	try {
		for (const file of newAppFilesOf(folder)) await layFile(vault, file.path, file.text);
	} catch (failure) {
		console.info(`[widgetarium] new app ${folder} → removed, a file was not written`);
		await vault.adapter.rmdir(folder, true);
		throw failure;
	}
}

async function layFile(vault: Vault, path: string, text: string): Promise<void> {
	for (const folder of foldersAlong(path))
		if (vault.getAbstractFileByPath(folder) === null) await vault.createFolder(folder);
	await vault.create(path, text);
}

function isAlreadyExists(failure: unknown): boolean {
	return ALREADY_EXISTS.test(failureMessage(failure));
}

async function runReported(said: string, run: () => Promise<void>): Promise<void> {
	try {
		await run();
	} catch (failure) {
		console.error(`[widgetarium] ${said}`, failure);
		throw new Error(`${said}: ${failureMessage(failure)}`);
	}
}
