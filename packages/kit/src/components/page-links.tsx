import { createElement as h } from "react";
import type { LooseProps } from "../types";
import { paginationItems } from "../utils/pagination";
import { PaginationEllipsis } from "./pagination-ellipsis";
import { PaginationLink } from "./pagination-link";
import { PaginationItem } from "./pagination-parts";

export function PageLinks({ current, count, siblings, onPage }: LooseProps) {
	return paginationItems(current, count, siblings).map((entry) =>
		entry.kind === "gap" ? (
			<PaginationItem key={`gap-${entry.key}`} data-part="page">
				<PaginationEllipsis />
			</PaginationItem>
		) : (
			<PaginationItem key={entry.page} data-part="page">
				<PaginationLink isActive={entry.page === current} onClick={() => onPage(entry.page)}>
					{entry.page}
				</PaginationLink>
			</PaginationItem>
		),
	);
}
