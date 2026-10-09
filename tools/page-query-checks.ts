import { createElement as h } from "react";
import { z } from "../packages/core/src/gateway/declared.ts";
import { IQuery } from "../packages/core/src/gateway/queries.ts";
import type { Row } from "../packages/core/src/gateway/contract.ts";
import type { HandlerContext } from "../packages/core/src/gateway/handler-context.ts";
import { PageInputSchema, PageOf, offsetOfCursor, pageAt } from "../packages/core/src/gateway/page.ts";
import type { Page, PageInput } from "../packages/core/src/gateway/page.ts";
import { useData } from "../packages/core/src/gateway/use-data.ts";
import type { PageState } from "../packages/core/src/gateway/use-data.ts";
import { createGatewayCache } from "../packages/core/src/gateway/cache.ts";
import { nextPageOf, pagedRunnerOf } from "../packages/core/src/gateway/paged-read.ts";
import { gatewayOverImplementation } from "../packages/core/src/gateway/adapted.ts";
import { shutHostFor } from "../packages/core/src/gateway/handler-context.ts";
import { isObject } from "../packages/core/src/engine/is-object.js";
import { rowOf } from "../packages/core/src/gateway/create.ts";
import { render } from "../packages/core/src/engine/render.js";
import { createWidget } from "../packages/core/src/widget-api.js";
import { byId } from "./dom-find.ts";
import { fieldIn } from "./held-fields.ts";
import { present } from "./page-dom.ts";

type Check = (what: string, got: unknown, wanted: unknown) => void;

type Note = { title: string };

interface Ask {
	readonly input: PageInput;
	readonly ctx: HandlerContext;
}

export async function checkPagedReads(check: Check): Promise<void> {
	console.log("\n— a Page query —");
	const asks: Ask[] = [];
	const paged: PageState<Note>[] = [];
	const twinPaged: PageState<Note>[] = [];
	const Notes = createReader(paged, "4");
	const NotesTwin = createReader(twinPaged, "0");
	const notesPage = createNotesPage(asks);
	const lastPaged = (): PageState<Note> | undefined => paged[paged.length - 1];
	render(h("div", null, h(Notes, { notes: notesPage })), byId(document, "host"));
	await settle();
	check(
		"useData on a Page query hands the items as data, the total beside them, and says more is left",
		[titlesOf(lastPaged()), lastPaged()?.total, lastPaged()?.hasMore],
		[["n0", "n1"], 5, true],
	);
	const firstAsk = present(asks[0], "the first ask of the page query");
	check(
		"the read starts at no cursor whatever cursor was asked, and an asked limit is honoured, not capped",
		[firstAsk.input.cursor, firstAsk.input.limit],
		[null, 500],
	);
	check(
		"ctx reaches the query handler: no user, the cache's live signal, the host named for the prop",
		[
			firstAsk.ctx.user,
			firstAsk.ctx.signal instanceof AbortSignal,
			firstAsk.ctx.signal.aborted,
			firstAsk.ctx.host.self,
		],
		[null, true, false, "notes"],
	);
	lastPaged()?.more();
	await settle();
	check(
		"more() appends the next page to what is drawn, asked with the cursor the last page handed",
		[titlesOf(lastPaged()), asks[asks.length - 1]?.input.cursor],
		[["n0", "n1", "n2", "n3"], "2"],
	);
	lastPaged()?.more();
	await settle();
	check(
		"once the last page is in, every row is drawn and nothing more is left",
		[titlesOf(lastPaged()).length, lastPaged()?.hasMore],
		[5, false],
	);
	const asksBeforeTwin = asks.length;
	render(h("div", null, h(Notes, { notes: notesPage }), h(NotesTwin, { notes: notesPage })), byId(document, "host"));
	await tick();
	check(
		"a second reader asking another cursor shares the same entry, every loaded page and no new read",
		[titlesOf(twinPaged[twinPaged.length - 1]), asks.length - asksBeforeTwin],
		[["n0", "n1", "n2", "n3", "n4"], 0],
	);
	render(null, byId(document, "host"));
	check("the query's signal is aborted once nothing reads it", asks[asks.length - 1]?.ctx.signal.aborted, true);
}

export async function checkMoreDuringReread(check: Check): Promise<void> {
	const raceCache = createGatewayCache();
	const raceMeta = { gatewayId: "race", verb: "query", subscribe: () => () => {}, isPaged: true };
	const answers: ((page: unknown) => void)[] = [];
	const raceRun = (): Promise<unknown> => new Promise((answer) => void answers.push(answer));
	const stopRace = raceCache.subscribe(raceMeta, {}, raceRun, () => {});
	answers[0]?.({ items: ["a"], next: "1" });
	await tick();
	void raceCache.refetch(["race"]);
	const extended = raceCache.extend(raceMeta, {}, async (before) => {
		const held = fieldIn(before, "items");
		return { items: [...(Array.isArray(held) ? held : []), "b"], next: null };
	});
	answers[1]?.({ items: ["A"], next: "1" });
	await extended;
	await tick();
	check(
		"more() asked while a re-read is in flight waits for it and appends to the fresh rows, losing neither",
		fieldIn(raceCache.read(raceMeta, {}).data, "items"),
		["A", "b"],
	);
	stopRace();
}

export async function checkPageLaws(check: Check): Promise<void> {
	console.log("\n— the laws a page is read by —");
	check(
		"a page input refuses a key it does not name rather than stripping it",
		PageInputSchema.safeParse({ limit: 2, tags: ["a"] }).success,
		false,
	);
	check(
		"an offset cursor that is not digits is refused, never read as the first page",
		refusalOf(() => offsetOfCursor("-3")),
		true,
	);
	check(
		"a PageOf output that lost its mark is refused when declared",
		refusalOf(() => IQuery.input(PageInputSchema).output(PageOf(NoteSchema).extend({}))),
		true,
	);
	check(
		"a PageOf output wrapped in optional is refused too",
		refusalOf(() => IQuery.input(PageInputSchema).output(PageOf(NoteSchema).optional())),
		true,
	);
	const undeclared = gatewayOverImplementation(
		"loose",
		{ kind: "collection", writes: [] },
		{ query: () => pageAt([], 0, 0), list: () => ({ rows: [], total: 0 }) },
		{ host: shutHostFor("loose") },
	);
	const undeclaredQuery: unknown = Reflect.get(undeclared, "query");
	check(
		"a query whose input nobody declared is refused when asked, not handed raw input",
		typeof undeclaredQuery === "function"
			? await Promise.resolve(Reflect.apply(undeclaredQuery, undeclared, [{}])).then(
					() => "answered",
					(failure: unknown) => (failure instanceof Error ? failure.message.includes("declares no input") : false),
				)
			: "no query",
		true,
	);
	await checkStalledPages(check);
	await checkQueuedMoreAndRefetch(check);
}

async function checkStalledPages(check: Check): Promise<void> {
	const signal = new AbortController().signal;
	const repeating = nextPageOf(async () => ({ items: ["b"], next: "1" }), {});
	check(
		"a page whose next is the cursor it was given ends the reading",
		fieldIn(await repeating({ items: ["a"], next: "1" }, signal), "next"),
		null,
	);
	const empty = nextPageOf(async () => ({ items: [], next: "9" }), {});
	check("an empty page ends the reading", fieldIn(await empty({ items: ["a"], next: "1" }, signal), "next"), null);
	let loads = 0;
	const oneAtATime = async (input: unknown) => {
		loads += 1;
		const cursor = isObject(input) && typeof input["cursor"] === "string" ? input["cursor"] : null;
		const offset = offsetOfCursor(cursor);
		return pageAt([offset], offset, Number.MAX_SAFE_INTEGER);
	};
	await pagedRunnerOf(oneAtATime, () => ({ items: Array.from({ length: 1000 }, (_, at) => at), next: "1000" }))(
		{},
		signal,
	);
	check("a re-read that a source hands one row at a time stops at a ceiling of loads", loads, 50);
}

async function checkQueuedMoreAndRefetch(check: Check): Promise<void> {
	const cache = createGatewayCache();
	const meta = { gatewayId: "held", verb: "query", subscribe: () => () => {}, isPaged: true };
	const letters = ["a", "b", "c", "d", "e", "f"];
	const asked: unknown[] = [];
	const read = async (input: unknown) => {
		asked.push(input);
		const cursor = isObject(input) && typeof input["cursor"] === "string" ? input["cursor"] : null;
		const limit = isObject(input) && typeof input["limit"] === "number" ? input["limit"] : 2;
		const offset = offsetOfCursor(cursor);
		return pageAt(letters.slice(offset, offset + limit), offset, letters.length);
	};
	const window = { limit: 2 };
	const stop = cache.subscribe(
		meta,
		window,
		pagedRunnerOf(read, () => cache.read(meta, window).data),
		() => {},
	);
	await settle();
	const first = cache.extend(meta, window, nextPageOf(read, window));
	void cache.extend(meta, window, nextPageOf(read, window));
	await first;
	await settle();
	check(
		"a second more() asked while one runs is queued, not lost",
		fieldIn(cache.read(meta, window).data, "items"),
		letters,
	);
	asked.length = 0;
	await cache.refetch(["held"]);
	check("a re-read of six held rows is one request asking six from the start", asked, [{ limit: 6, cursor: null }]);
	stop();
}

function refusalOf(attempt: () => unknown): boolean {
	try {
		attempt();
		return false;
	} catch {
		return true;
	}
}

const NoteSchema = z.object({ title: z.string() });
const NOTE_ROWS = Array.from({ length: 5 }, (_, at) => rowOf<Note>({ title: `n${at}` }, `n${at}`));
const PAGE_HANDS = 2;

const tick = (): Promise<void> => new Promise((settled) => setTimeout(settled, 0));
const settle = async (): Promise<void> => {
	await tick();
	await tick();
};
const titlesOf = (state: PageState<Note> | undefined): string[] => (state?.data ?? []).map((note) => note.title);

function createNotesPage(asks: Ask[]) {
	return new (class NotesPage extends IQuery.input(PageInputSchema).output(PageOf(NoteSchema)) {
		query(input: PageInput, ctx: HandlerContext): Page<Row<Note>> {
			asks.push({ input, ctx });
			const offset = offsetOfCursor(input.cursor);
			return pageAt(NOTE_ROWS.slice(offset, offset + Math.min(input.limit, PAGE_HANDS)), offset, NOTE_ROWS.length);
		}
	})();
}

function createReader(seen: PageState<Note>[], cursor: string) {
	return createWidget({
		inject: { notes: IQuery.input(PageInputSchema).output(PageOf(NoteSchema)) },
		draw: ({ notes }) => {
			const askedWithCursor = { limit: 500, cursor };
			seen.push(useData(notes, askedWithCursor));
			return null;
		},
	});
}
