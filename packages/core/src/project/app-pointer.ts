import { z } from "zod";

export const ROOT_ROUTE = "/";

export const AppPointerSchema = z.object({
	app: z.string().min(1),
	route: z.string().min(1).default(ROOT_ROUTE),
});

export type AppPointer = z.output<typeof AppPointerSchema>;

export type AppPointerReading = { readonly pointer: AppPointer } | { readonly refusal: string };

const TRAILING_SLASHES = /\/+$/;

export function readAppPointer(parsed: unknown): AppPointerReading {
	const read = AppPointerSchema.safeParse(parsed);
	if (!read.success) return { refusal: z.prettifyError(read.error) };
	return { pointer: { ...read.data, app: read.data.app.replace(TRAILING_SLASHES, "") } };
}
