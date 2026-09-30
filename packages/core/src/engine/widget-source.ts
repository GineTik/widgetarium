import { readRecord, recordIn } from "./catalogue-index.js";
import type { Fields, WidgetRecord } from "./catalogue-index.js";
import { SOURCE_FILES, javascriptSourceRefusal, missingSourceRefusal, sourceFileIn } from "./widget-build.js";
import {
	idOfFolder,
	isCleanRepositoryPath,
	isPathInsideFolder,
	rawUrl,
	readRepository,
	scopeRefusal,
	scopedName,
} from "./github.js";
import type { Repository } from "./github.js";
import { apiRefusal } from "../version.js";
import { failureMessage } from "./failure-message.js";
import { isObject } from "./is-object.js";
import {
	SCOPE_FILES,
	WIDGET_FILES,
	filesUnder,
	javascriptNamesAt,
	scopeOf,
	stampOf,
	widgetFilesAt,
} from "./source-disk.js";
import type { HeldFiles } from "./source-disk.js";
import { commitNamed, offersInFolder, offersInRepository } from "./source-offers.js";
import type { SourceDoors, WidgetOffer, WidgetSourcePlace } from "./source-offers.js";

export { SCOPE_FILES, WHAT_A_FOLDER_WAS_STAMPED_BEFORE_STAMPS, WIDGET_FILES, scopeOf, stampOf } from "./source-disk.js";
export type { SourceDisk } from "./source-disk.js";
export type { SourceDoors, WidgetOffer, WidgetSourcePlace } from "./source-offers.js";

export interface ListedWidget {
	readonly manifest?: Fields | null | undefined;
	readonly from?: { readonly folder?: string | null | undefined } | null | undefined;
}

export interface FetchProgress {
	readonly done: number;
	readonly total: number;
}

export type OnFetchStep = (progress: FetchProgress) => void;

export type WidgetFiles =
	| {
			readonly ok: true;
			readonly files: HeldFiles;
			readonly scope: HeldFiles;
			readonly record: WidgetRecord;
			readonly commit: string;
			readonly failure: null;
	  }
	| {
			readonly ok: false;
			readonly files: null;
			readonly scope: null;
			readonly record: null;
			readonly commit: null;
			readonly failure: string;
	  };

export interface WidgetSource {
	offersFrom(source: WidgetSourcePlace | null | undefined): Promise<WidgetOffer[]>;
	filesOf(listed: ListedWidget | null | undefined, onStep?: OnFetchStep): Promise<WidgetFiles>;
}

interface HeldWidget {
	readonly files: HeldFiles;
	readonly scope: HeldFiles;
	readonly record: WidgetRecord;
	readonly commit: string;
}

type Fetched = { readonly ok: true; readonly files: HeldFiles; readonly commit: string } | WidgetFiles;

export function createWidgetSource(doors: SourceDoors): WidgetSource {
	return {
		async offersFrom(source) {
			const repository = source?.repository;
			if (repository) return offersInRepository(doors, { ...source, repository });
			const path = source?.path;
			return path ? offersInFolder(doors.disk, { ...source, path }) : [];
		},

		async filesOf(listed, onStep) {
			const folder = listed?.from?.folder;
			if (folder) return fromFolder(doors, listed.manifest, folder);
			return fromRepository(doors, listed?.manifest ?? {}, onStep);
		},
	};
}

async function fromFolder(
	{ disk }: SourceDoors,
	manifest: Fields | null | undefined,
	folder: string,
): Promise<WidgetFiles> {
	const refusal = scopeRefusal(manifest?.["id"]);
	if (refusal) return refuse(refusal);
	if (!disk) return refuse("this build cannot read a folder outside the vault");

	const files = await widgetFilesAt(disk, folder);
	if (!sourceFileIn(files)) return refuse(missingSourceRefusal(await javascriptNamesAt(disk, folder), folder));

	const scope = await filesUnder(disk, scopeOf(folder), SCOPE_FILES);
	return answerHeld({ files, scope, record: readRecord(manifest, idOfFolder(folder)), commit: stampOf(files) });
}

function listedSourceRefusal(wanted: readonly string[], manifest: Fields): string | null {
	if (SOURCE_FILES.some((name) => wanted.includes(name))) return null;
	return (
		javascriptSourceRefusal(wanted, String(manifest["path"] ?? manifest["id"])) ?? "the entry lists no widget source"
	);
}

function wantedFilesOf(manifest: Fields): readonly unknown[] {
	const listed = manifest["files"];
	return Array.isArray(listed) && listed.length > 0 ? listed : WIDGET_FILES;
}

async function fromRepository(
	doors: SourceDoors,
	manifest: Fields,
	onStep: OnFetchStep | undefined,
): Promise<WidgetFiles> {
	const repository = readRepository(manifest["repository"]);
	if (!repository) return refuse("this entry names no repository to fetch from");
	const refusal = scopeRefusal(manifest["id"]);
	if (refusal) return refuse(refusal);

	const path = manifest["path"];
	if (path !== undefined && path !== null && !isCleanRepositoryPath(path))
		return refuse(`"${String(path)}" is not a place inside the repository`);

	const listed = wantedFilesOf(manifest);
	const wanted = listed.filter(isPathInsideFolder);
	const stray = listed.find((name) => !isPathInsideFolder(name));
	if (wanted.length !== listed.length) return refuse(`"${String(stray)}" is not a file name a widget folder can hold`);
	const unlisted = listedSourceRefusal(wanted, manifest);
	if (unlisted) return refuse(unlisted);

	const under = typeof path === "string" ? path : scopedName(manifest["id"]);
	const fetched = await fetchFrom(doors, repository, { ref: manifest["ref"], under: String(under) }, wanted, onStep);
	if (!fetched.ok) return fetched;

	const served = readServedRecord(fetched.files, manifest, String(manifest["id"]));
	if (!served.ok) return refuse(served.failure);
	return answerHeld({ files: fetched.files, scope: {}, record: served.record, commit: fetched.commit });
}

async function fetchFrom(
	doors: SourceDoors,
	repository: Repository,
	{ ref, under }: { readonly ref: unknown; readonly under: string },
	wanted: readonly string[],
	onStep: OnFetchStep | undefined,
): Promise<Fetched> {
	const files: HeldFiles = {};
	try {
		const commit = await commitNamed(doors, repository, ref);
		if (!commit) return refuse("the repository named no commit for that ref");
		onStep?.({ done: 0, total: wanted.length });
		for (const [at, name] of wanted.entries()) {
			files[name] = await doors.fetchText(rawUrl(repository, commit, `${under}/${name}`));
			onStep?.({ done: at + 1, total: wanted.length });
		}
		return { ok: true, files, commit };
	} catch (failure) {
		return refuse(failureMessage(failure));
	}
}

type ServedRecord =
	| { readonly ok: true; readonly record: WidgetRecord; readonly failure: null }
	| { readonly ok: false; readonly record: null; readonly failure: string };

function readServedRecord(files: HeldFiles, promised: Fields, promisedId: string): ServedRecord {
	const served = recordIn(files);
	if (served === undefined) return { ok: true, record: readRecord(promised, promisedId), failure: null };

	let parsed: unknown;
	try {
		parsed = JSON.parse(served);
	} catch {
		return { ok: false, record: null, failure: "the widget's card did not come back as JSON" };
	}
	const servedId = isObject(parsed) ? parsed["id"] : undefined;
	if (servedId !== undefined && servedId !== promisedId)
		return { ok: false, record: null, failure: `the repository served "${String(servedId)}" under "${promisedId}"` };
	return { ok: true, record: readRecord(parsed, promisedId), failure: null };
}

function answerHeld(held: HeldWidget): WidgetFiles {
	const refusal = apiRefusal(held.record);
	return refusal ? refuse(refusal) : { ok: true, ...held, failure: null };
}

function refuse(failure: string): WidgetFiles & { readonly ok: false } {
	return { ok: false, files: null, scope: null, record: null, commit: null, failure };
}
