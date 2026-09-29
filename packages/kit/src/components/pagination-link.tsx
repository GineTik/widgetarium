import { createElement as h } from "react";
import type { LooseProps } from "../types";
import { PaginationButton } from "./pagination-button";
import { PAGE_LOOK } from "./pagination-parts";

export function PaginationLink(props: LooseProps) {
	return <PaginationButton {...props} look={PAGE_LOOK} />;
}
