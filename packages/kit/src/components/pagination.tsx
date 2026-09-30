import { createElement as h } from "react";
import type { ReactElement } from "react";
import { PaginationPreset } from "./pagination-preset";
import type { PaginationPresetProps } from "./pagination-preset";
import { PaginationRoot } from "./pagination-root";

export { PaginationContent, PaginationItem } from "./pagination-parts";
export { PaginationLink } from "./pagination-link";
export { PaginationPrevious } from "./pagination-previous";
export { PaginationNext } from "./pagination-next";
export { PaginationEllipsis } from "./pagination-ellipsis";

export type PaginationProps = PaginationPresetProps;

export function Pagination({ children, ...props }: PaginationProps): ReactElement | null {
	if (children !== undefined && children !== null) return <PaginationRoot {...props} children={children} />;
	return <PaginationPreset {...props} />;
}
