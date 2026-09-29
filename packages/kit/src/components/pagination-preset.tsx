import { createElement as h } from "react";
import { PAGINATION_VARIANT_WORD } from "../constants/pagination";
import { useControllableState } from "../hooks/use-controllable-state";
import type { LooseProps } from "../types";
import { wornWord } from "../utils/surface";
import { PageLinks } from "./page-links";
import { PageOf } from "./page-of";
import { PaginationNext } from "./pagination-next";
import { PaginationContent, PaginationItem } from "./pagination-parts";
import { PaginationPrevious } from "./pagination-previous";
import { PaginationRoot } from "./pagination-root";

export function PaginationPreset({
	page,
	defaultPage = 1,
	onPageChange,
	count = 0,
	siblings,
	variant,
	...props
}: LooseProps) {
	const [asked, setPage] = useControllableState({ prop: page, defaultProp: defaultPage, onChange: onPageChange });
	if (count <= 1) return null;
	const current = Math.min(Math.max(asked, 1), count);
	return (
		<PaginationRoot {...props} data-variant={wornWord(variant, PAGINATION_VARIANT_WORD)}>
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious disabled={current === 1} onClick={() => setPage(current - 1)} />
				</PaginationItem>
				<PageLinks current={current} count={count} siblings={siblings} onPage={setPage} />
				<PageOf current={current} count={count} />
				<PaginationItem>
					<PaginationNext disabled={current === count} onClick={() => setPage(current + 1)} />
				</PaginationItem>
			</PaginationContent>
		</PaginationRoot>
	);
}
