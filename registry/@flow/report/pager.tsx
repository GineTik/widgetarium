import { Button, Icon } from "widgetarium/kit";

type PagerProps = { at: number; last: number; counted: number; perPage: number; onPage: (at: number) => void };

const PAGE_SAID = "Steps {from} to {to} of {of}.";

export function Pager({ at, last, counted, perPage, onPage }: PagerProps) {
	const said = PAGE_SAID.replace("{from}", String(at * perPage + 1))
		.replace("{to}", String(Math.min(counted, (at + 1) * perPage)))
		.replace("{of}", String(counted));
	return (
		<div className="flow-report-pager">
			<Button variant="ghost" size="s" disabled={at === 0} onClick={() => onPage(at - 1)}>
				<Icon name="chevron-left" />
				Back
			</Button>
			<span className="flow-report-pager-said">{said}</span>
			<Button variant="ghost" size="s" disabled={at >= last} onClick={() => onPage(at + 1)}>
				Next
				<Icon name="chevron-right" />
			</Button>
		</div>
	);
}
