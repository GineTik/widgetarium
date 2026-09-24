export const PAGINATION_VARIANTS = ["full", "compact"];

export const PAGINATION_VARIANT_WORD = {
	kind: "pagination variant",
	allowed: PAGINATION_VARIANTS,
	fallback: PAGINATION_VARIANTS[0],
};

export const PAGE_OF_SHOWN = "{page} / {count}";

export const PAGE_OF_SPOKEN = "Page {page} of {count}";
