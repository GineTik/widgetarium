import { Icon } from "widgetarium/kit";
import type { Row } from "widgetarium";
import { trimText } from "./prose-of";
import type { TestStep } from "./types";

const UNNAMED_STEP = "An unnamed step.";

export function TestStepRow({ row }: { row: Row<TestStep> }) {
	const expected = trimText(row.expect);
	return (
		<li className="flow-report-step" data-done={row.done === true ? "" : undefined}>
			<Icon name={row.done === true ? "check" : "circle"} />
			<span className="flow-report-step-what">{trimText(row.step) || UNNAMED_STEP}</span>
			{expected ? <span className="flow-report-step-expected">{expected}</span> : null}
		</li>
	);
}
