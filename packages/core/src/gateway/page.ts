import { z } from "zod";

export const PAGE_UNASKED = 100;

export const PAGE_ITEM: unique symbol = Symbol.for("widgetarium.page-item");

export const PageInputSchema = z.strictObject({
	cursor: z.string().nullable().optional(),
	limit: z.number().int().min(1).default(PAGE_UNASKED),
});

export type PageInput = z.output<typeof PageInputSchema>;

export interface Page<Item> {
	readonly items: readonly Item[];
	readonly next: string | null;
	readonly total?: number;
}

const OFFSET_CURSOR = /^\d+$/;

const NOT_AN_OFFSET = 'a cursor of this page is an offset, written in digits; "{cursor}" is not one';

export type PageSchema<Item extends z.ZodType> = ReturnType<typeof pageShapeOf<Item>> & { readonly [PAGE_ITEM]: Item };

export function PageOf<const Item extends z.ZodType>(item: Item): PageSchema<Item> {
	return Object.assign(pageShapeOf(item), { [PAGE_ITEM]: item });
}

export function pageItemOf(schema: unknown): z.ZodType | null {
	if (typeof schema !== "object" || schema === null || !(PAGE_ITEM in schema)) return null;
	const item: unknown = schema[PAGE_ITEM];
	return item instanceof z.ZodType ? item : null;
}

export function isPageSchema(schema: unknown): boolean {
	return pageItemOf(schema) !== null;
}

export function offsetOfCursor(cursor: string | null | undefined): number {
	if (cursor === null || cursor === undefined) return 0;
	const offset = OFFSET_CURSOR.test(cursor) ? Number(cursor) : Number.NaN;
	if (!Number.isSafeInteger(offset)) throw new RangeError(NOT_AN_OFFSET.replace("{cursor}", cursor));
	return offset;
}

export interface Listing {
	readonly rows: readonly unknown[];
	readonly total: number;
}

export type ListingRead = (query: { readonly offset: number; readonly limit: number }) => Listing | Promise<Listing>;

export async function pageOverListing(list: ListingRead, { cursor, limit }: PageInput): Promise<Page<unknown>> {
	const offset = offsetOfCursor(cursor);
	const listed = await list({ offset, limit });
	return pageAt(listed.rows, offset, listed.total);
}

export function pageAt<Item>(items: readonly Item[], offset: number, total: number): Page<Item> {
	const reached = offset + items.length;
	return { items: [...items], next: reached < total && items.length > 0 ? String(reached) : null, total };
}

function pageShapeOf<Item extends z.ZodType>(item: Item) {
	return z.object({ items: z.array(item).readonly(), next: z.string().nullable(), total: z.number().int().optional() });
}
