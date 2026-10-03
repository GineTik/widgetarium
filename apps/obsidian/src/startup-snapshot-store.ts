import type { App } from "obsidian";
import type { StartupSnapshot, StartupSnapshotStore } from "@widgetarium/core/startup-snapshot.js";

const DATABASE_PREFIX = "widgetarium-startup-";
const OBJECT_STORE = "snapshot";
const SNAPSHOT_KEY = "widgets";
const DATABASE_VERSION = 1;

export function indexedDbSnapshotStore(app: App): StartupSnapshotStore {
	const database = openedOnce(() => `${DATABASE_PREFIX}${vaultKeyOf(app)}`);
	return {
		read: async () =>
			answerOf((await database()).transaction(OBJECT_STORE).objectStore(OBJECT_STORE).get(SNAPSHOT_KEY)),
		write: async (snapshot: StartupSnapshot) => {
			const writing = (await database()).transaction(OBJECT_STORE, "readwrite");
			writing.objectStore(OBJECT_STORE).put(snapshot, SNAPSHOT_KEY);
			await committed(writing);
		},
	};
}

function openedOnce(nameOf: () => string): () => Promise<IDBDatabase> {
	let opened: Promise<IDBDatabase> | null = null;
	return () => {
		opened ??= openDatabase(nameOf());
		return opened;
	};
}

// TRADE-OFF: appId is not in Obsidian's typings, but it is the key Obsidian names its own metadata cache by
function vaultKeyOf(app: App): string {
	const appId: unknown = Reflect.get(app, "appId");
	return typeof appId === "string" && appId !== "" ? appId : app.vault.getName();
}

async function openDatabase(name: string): Promise<IDBDatabase> {
	return new Promise((done, failed) => {
		const opening = window.indexedDB.open(name, DATABASE_VERSION);
		opening.onupgradeneeded = () => opening.result.createObjectStore(OBJECT_STORE);
		opening.onsuccess = () => done(opening.result);
		opening.onerror = () => failed(opening.error);
	});
}

function answerOf(request: IDBRequest): Promise<unknown> {
	return new Promise((done, failed) => {
		request.onsuccess = () => done(request.result);
		request.onerror = () => failed(request.error);
	});
}

function committed(transaction: IDBTransaction): Promise<void> {
	return new Promise((done, failed) => {
		transaction.oncomplete = () => done();
		transaction.onerror = () => failed(transaction.error);
		transaction.onabort = () => failed(transaction.error);
	});
}
