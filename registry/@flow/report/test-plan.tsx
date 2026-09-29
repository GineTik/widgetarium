import type { Row } from "widgetarium";
import { Pager } from "./pager";
import { TestStepRow } from "./test-step-row";
import type { TestStep } from "./types";

type PlanProps = { rows: Row<TestStep>[]; counted: number; at: number; perPage: number; onPage: (at: number) => void };

export function TestPlan({ rows, counted, at, perPage, onPage }: PlanProps) {
	if (rows.length === 0) return null;
	const last = Math.max(0, Math.ceil(counted / perPage) - 1);
	return (
		<section className="flow-report-part">
			<h3 className="flow-report-part-name">Test plan</h3>
			<ol className="flow-report-steps">
				{rows.map((row) => (
					<TestStepRow key={row.ref} row={row} />
				))}
			</ol>
			{last > 0 ? <Pager at={at} last={last} counted={counted} perPage={perPage} onPage={onPage} /> : null}
		</section>
	);
}
