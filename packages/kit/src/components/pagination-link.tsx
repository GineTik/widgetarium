import { createElement as h } from "react";
import type { ReactElement } from "react";
import { PaginationButton } from "./pagination-button";
import type { PaginationButtonProps } from "./pagination-button";
import { PAGE_LOOK } from "./pagination-parts";

export type PaginationLinkProps = Omit<PaginationButtonProps, "look">;

export function PaginationLink(props: PaginationLinkProps): ReactElement {
	return <PaginationButton {...props} look={PAGE_LOOK} />;
}
