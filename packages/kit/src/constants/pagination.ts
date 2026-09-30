import type { WordChoice } from "../utils/surface";

export type PaginationVariant = "full" | "compact";

export const PAGINATION_VARIANTS: readonly PaginationVariant[] = ["full", "compact"];

export const PAGINATION_VARIANT_WORD: WordChoice<PaginationVariant> = {
	kind: "pagination variant",
	allowed: PAGINATION_VARIANTS,
	fallback: "full",
};

export const PAGE_OF_SHOWN = "{page} / {count}";

export const PAGE_OF_SPOKEN = "Page {page} of {count}";
