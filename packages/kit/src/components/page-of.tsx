import { createElement as h } from "react";
import type { ReactElement } from "react";
import { PAGE_OF_SHOWN, PAGE_OF_SPOKEN } from "../constants/pagination";

export interface PageOfProps {
	readonly current: number;
	readonly count: number;
}

export function PageOf({ current, count }: PageOfProps): ReactElement {
	const said = (sentence: string): string =>
		sentence.replace("{page}", String(current)).replace("{count}", String(count));
	return (
		<li className="wg-kit-pagination-item wg-kit-pagination-status" role="status" aria-label={said(PAGE_OF_SPOKEN)}>
			{said(PAGE_OF_SHOWN)}
		</li>
	);
}
