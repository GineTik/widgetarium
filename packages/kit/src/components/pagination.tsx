import { createElement as h } from "react";
import type { LooseProps } from "../types";
import { PaginationPreset } from "./pagination-preset";
import { PaginationRoot } from "./pagination-root";

export { PaginationContent, PaginationItem } from "./pagination-parts";
export { PaginationLink } from "./pagination-link";
export { PaginationPrevious } from "./pagination-previous";
export { PaginationNext } from "./pagination-next";
export { PaginationEllipsis } from "./pagination-ellipsis";

export function Pagination({ children, ...props }: LooseProps) {
	if (children !== undefined && children !== null) return <PaginationRoot {...props} children={children} />;
	return <PaginationPreset {...props} />;
}
