import { valueGateway } from "@widgetarium/core/gateway/create.js";
import type { GatewayEvent, Unsubscribe, ValueGateway } from "@widgetarium/core/gateway/contract.js";
import type { EveryValueVerb } from "@widgetarium/core/gateway/needs.js";
import { coerceOne } from "@widgetarium/core/gateway/mapped.js";
import { NOTE_CONTENT, NOTE_NAME } from "@widgetarium/core/gateway/obsidian.js";
import type { FileHost, NoteHere, NoteRecord } from "@widgetarium/core/gateway/obsidian.js";
import { recordRefOf } from "./note-ref.js";

interface NotePart {
	readonly field?: string | undefined;
	readonly type?: string | undefined;
}

interface FileGatewayOptions {
	readonly host: FileHost;
	readonly path: string;
	readonly part?: NotePart;
	readonly requested?: readonly string[];
}

type Held<T> = T | null | undefined;

type Subscribe = (listener: (event: GatewayEvent) => void) => Unsubscribe;

type NoteHandlers = {
	get?: () => Promise<unknown>;
	update?: (content: unknown) => unknown;
};

const NOTE_PARTS: ReadonlyMap<string, (record: NoteRecord) => unknown> = new Map([
	[NOTE_CONTENT, (record: NoteRecord) => record.content],
	[NOTE_NAME, (record: NoteRecord) => record.name],
]);

export function fileGateway({
	host,
	path,
	part = {},
	requested = [],
}: FileGatewayOptions): ValueGateway<unknown, EveryValueVerb> {
	const { field, type } = part;
	return valueGateway({
		id: field ? `file:${path}#${field}` : `file:${path}`,
		handlers: noteHandlers(host.file?.(path), field, type),
		requested: [...requested],
		...fileSubscription(host, path),
	});
}

function fileSubscription(host: FileHost, path: string): { subscribe?: Subscribe } {
	if (!host.watchFile) return {};
	const watchFile = host.watchFile.bind(host);
	return { subscribe: (listener) => watchFile(path, () => listener({ refs: [recordRefOf(path)] })) };
}

function partOfNote(record: NoteRecord, field: string): unknown {
	const part = NOTE_PARTS.get(field);
	return part ? part(record) : record.props?.[field];
}

function noteHandlers(solo: Held<NoteHere>, field: Held<string>, type: Held<string>): NoteHandlers {
	if (!solo) return {};
	const get = async (): Promise<unknown> => fieldOfNote(await solo.get(), field, type);
	// TODO: write a name or a property back — only the body has a writer on one note
	if (!solo.canUpdate || (field && field !== NOTE_CONTENT)) return { get };
	return { get, update: (content) => solo.update(content) };
}

function fieldOfNote(record: Held<NoteRecord>, field: Held<string>, type: Held<string>): unknown {
	if (!record || !field) return record;
	return coerceOne(partOfNote(record, field), type ?? "");
}
