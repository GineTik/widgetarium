import { createElement as h } from "react";
import { PAGE_OF_SHOWN, PAGE_OF_SPOKEN } from "../constants/pagination";
import type { LooseProps } from "../types";

export function PageOf({ current, count }: LooseProps) {
	const said = (sentence: string) => sentence.replace("{page}", String(current)).replace("{count}", String(count));
	return (
		<li className="wg-kit-pagination-item wg-kit-pagination-status" role="status" aria-label={said(PAGE_OF_SPOKEN)}>
			{said(PAGE_OF_SHOWN)}
		</li>
	);
}
