import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { PAGINATION_VARIANT_WORD } from "../constants/pagination";
import type { PaginationVariant } from "../constants/pagination";
import { useControllableState } from "../hooks/use-controllable-state";
import { wornWord } from "../utils/surface";
import { PageLinks } from "./page-links";
import { PageOf } from "./page-of";
import { PaginationNext } from "./pagination-next";
import { PaginationContent, PaginationItem } from "./pagination-parts";
import { PaginationPrevious } from "./pagination-previous";
import { PaginationRoot } from "./pagination-root";

export interface PaginationPresetProps extends HTMLAttributes<HTMLElement> {
	readonly page?: number | undefined;
	readonly defaultPage?: number;
	readonly onPageChange?: ((page: number) => void) | undefined;
	readonly count?: number | undefined;
	readonly siblings?: number | undefined;
	readonly variant?: PaginationVariant | undefined;
}

const FIRST_PAGE = 1;

export function PaginationPreset({
	page,
	defaultPage = FIRST_PAGE,
	onPageChange,
	count = 0,
	siblings,
	variant,
	...props
}: PaginationPresetProps): ReactElement | null {
	const [asked, setPage] = useControllableState({ prop: page, defaultProp: defaultPage, onChange: onPageChange });
	if (count <= 1) return null;
	const current = Math.min(Math.max(asked, FIRST_PAGE), count);
	return (
		<PaginationRoot {...props} data-variant={wornWord(variant, PAGINATION_VARIANT_WORD)}>
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious disabled={current === FIRST_PAGE} onClick={() => setPage(current - 1)} />
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
