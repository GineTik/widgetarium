import { createElement as h } from "react";
import type { ReactElement } from "react";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
	paginationItems,
} from "../../index";

export interface HandBuiltPagesProps {
	readonly page: number;
	readonly count: number;
	readonly onPage: (page: number) => void;
}

export function HandBuiltPages({ page, count, onPage }: HandBuiltPagesProps): ReactElement {
	return (
		<Pagination>
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious disabled={page === 1} onClick={() => onPage(page - 1)} />
				</PaginationItem>
				{paginationItems(page, count, 0).map((entry) =>
					entry.kind === "gap" ? (
						<PaginationItem key={`gap-${entry.key}`}>
							<PaginationEllipsis />
						</PaginationItem>
					) : (
						<PaginationItem key={entry.page}>
							<PaginationLink isActive={entry.page === page} onClick={() => onPage(entry.page)}>
								{entry.page}
							</PaginationLink>
						</PaginationItem>
					),
				)}
				<PaginationItem>
					<PaginationNext disabled={page === count} onClick={() => onPage(page + 1)} />
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	);
}
