import type { Extension, Runner } from "./cache";
import { PAGE_UNASKED } from "./page";
import type { Page } from "./page";
import { isObject } from "../engine/is-object";

export type PageReading = (input: unknown, signal?: AbortSignal) => Promise<unknown>;

type Asked = Readonly<Record<string, unknown>>;

interface PageWindow {
	readonly cursor: string | null;
	readonly limit?: number;
}

const PAGE_LOADS_MOST = 50;

const NOT_A_PAGE = "a paged read answered something that is not a page";

export function withoutCursor(input: unknown): Asked {
	if (!isObject(input)) return {};
	return Object.fromEntries(Object.entries(input).filter(([key]) => key !== "cursor"));
}

export function isPage(held: unknown): held is Page<unknown> {
	if (!isObject(held) || !Array.isArray(held["items"])) return false;
	const next = held["next"];
	return next === null || typeof next === "string";
}

export function pageIn(answer: unknown): Page<unknown> {
	if (!isPage(answer)) throw new TypeError(NOT_A_PAGE);
	return answer;
}

export function itemsHeldIn(held: unknown): number {
	return isPage(held) ? held.items.length : 0;
}

export function pagedRunnerOf(read: PageReading, heldNow: () => unknown): Runner {
	return (input, signal) => loadPagesThrough(read, withoutCursor(input), signal, itemsHeldIn(heldNow()));
}

export function nextPageOf(read: PageReading, input: unknown): Extension {
	const asked = withoutCursor(input);
	return async (before, signal) => {
		if (!isPage(before) || before.next === null) return before;
		const page = await pageAnswer(read, asked, { cursor: before.next }, signal);
		return { ...page, items: [...before.items, ...page.items] };
	};
}

async function loadPagesThrough(read: PageReading, asked: Asked, signal: AbortSignal, held: number) {
	let page = await pageAnswer(read, asked, firstWindowOf(asked, held), signal);
	let items = page.items;
	for (let loads = 1; page.next !== null && items.length < held && loads < PAGE_LOADS_MOST; loads += 1) {
		page = await pageAnswer(read, asked, { cursor: page.next }, signal);
		items = [...items, ...page.items];
	}
	return { ...page, items };
}

function firstWindowOf(asked: Asked, held: number): PageWindow {
	const limit = asked["limit"];
	const askedLimit = typeof limit === "number" ? limit : PAGE_UNASKED;
	return held > askedLimit ? { cursor: null, limit: held } : { cursor: null };
}

async function pageAnswer(read: PageReading, asked: Asked, window: PageWindow, signal: AbortSignal) {
	const answer = pageIn(await read({ ...asked, ...window }, signal));
	const isStalled = answer.items.length === 0 || answer.next === window.cursor;
	return isStalled ? { ...answer, next: null } : answer;
}
