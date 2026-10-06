const DATABASE = "widgetarium-canvas-pictures";
const PICTURES = "pictures";
const DATABASE_VERSION = 1;

let opened: Promise<IDBDatabase> | null = null;

export async function storedPictureOf(key: string): Promise<Blob | null> {
	const read = (await database()).transaction(PICTURES).objectStore(PICTURES).get(key);
	const held: unknown = await answerOf(read);
	return held instanceof Blob ? held : null;
}

export async function storePicture(key: string, picture: Blob): Promise<void> {
	const writing = (await database()).transaction(PICTURES, "readwrite");
	writing.objectStore(PICTURES).put(picture, key);
	await new Promise<void>((done, failed) => {
		writing.oncomplete = () => done();
		writing.onerror = () => failed(writing.error);
	});
}

function database(): Promise<IDBDatabase> {
	opened ??= new Promise((done, failed) => {
		const opening = window.indexedDB.open(DATABASE, DATABASE_VERSION);
		opening.onupgradeneeded = () => opening.result.createObjectStore(PICTURES);
		opening.onsuccess = () => done(opening.result);
		opening.onerror = () => failed(opening.error);
	});
	return opened;
}

function answerOf(request: IDBRequest): Promise<unknown> {
	return new Promise((done, failed) => {
		request.onsuccess = () => done(request.result);
		request.onerror = () => failed(request.error);
	});
}
