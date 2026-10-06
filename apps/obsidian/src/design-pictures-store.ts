const DATABASE = "widgetarium-canvas-pictures";
const FRAMES = "frames";
const OLD_PICTURES = "pictures";
const DATABASE_VERSION = 2;
const FORGOTTEN_AFTER_MS = 30 * 24 * 60 * 60 * 1000;
const TOUCHED_EVERY_MS = 24 * 60 * 60 * 1000;

export interface FramePicture {
	readonly key: string;
	readonly picture: Blob;
	readonly usedAt: number;
}

let opened: Promise<IDBDatabase> | null = null;

export async function framePictureOf(frame: string): Promise<FramePicture | null> {
	const held = await answerOf((await database()).transaction(FRAMES).objectStore(FRAMES).get(frame));
	if (!isFramePicture(held)) return null;
	if (Date.now() - held.usedAt > TOUCHED_EVERY_MS) void keepFramePicture(frame, held.key, held.picture);
	return held;
}

export async function keepFramePicture(frame: string, key: string, picture: Blob): Promise<void> {
	const writing = (await database()).transaction(FRAMES, "readwrite");
	writing.objectStore(FRAMES).put({ key, picture, usedAt: Date.now() }, frame);
	await committed(writing);
}

function database(): Promise<IDBDatabase> {
	opened ??= openDatabase().then(async (opening) => {
		await forgetUnused(opening);
		return opening;
	});
	return opened;
}

function openDatabase(): Promise<IDBDatabase> {
	return new Promise((done, failed) => {
		const opening = window.indexedDB.open(DATABASE, DATABASE_VERSION);
		opening.onupgradeneeded = () => {
			if (opening.result.objectStoreNames.contains(OLD_PICTURES)) opening.result.deleteObjectStore(OLD_PICTURES);
			if (!opening.result.objectStoreNames.contains(FRAMES)) opening.result.createObjectStore(FRAMES);
		};
		opening.onsuccess = () => done(opening.result);
		opening.onerror = () => failed(opening.error);
	});
}

async function forgetUnused(opened: IDBDatabase): Promise<void> {
	const writing = opened.transaction(FRAMES, "readwrite");
	const walking = writing.objectStore(FRAMES).openCursor();
	walking.onsuccess = () => {
		const cursor = walking.result;
		if (!cursor) return;
		const held: unknown = cursor.value;
		if (!isFramePicture(held) || Date.now() - held.usedAt > FORGOTTEN_AFTER_MS) cursor.delete();
		cursor.continue();
	};
	await committed(writing);
}

function isFramePicture(held: unknown): held is FramePicture {
	return (
		typeof held === "object" &&
		held !== null &&
		typeof Reflect.get(held, "key") === "string" &&
		Reflect.get(held, "picture") instanceof Blob &&
		typeof Reflect.get(held, "usedAt") === "number"
	);
}

function committed(writing: IDBTransaction): Promise<void> {
	return new Promise((done, failed) => {
		writing.oncomplete = () => done();
		writing.onerror = () => failed(writing.error);
		writing.onabort = () => failed(writing.error);
	});
}

function answerOf(request: IDBRequest): Promise<unknown> {
	return new Promise((done, failed) => {
		request.onsuccess = () => done(request.result);
		request.onerror = () => failed(request.error);
	});
}
