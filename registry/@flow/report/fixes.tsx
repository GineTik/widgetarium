import type { Row } from "widgetarium";
import { trimmed } from "./prose-of";
import type { Fix } from "./types";

const UNNAMED_FIX = "An unnamed fix.";
const MORE_FIXES = "{count} more are not shown here.";

export function Fixes({ rows, counted }: { rows: Row<Fix>[]; counted: number }) {
	if (rows.length === 0) return null;
	const left = counted - rows.length;
	return (
		<section className="flow-report-part">
			<h3 className="flow-report-part-name">What was fixed</h3>
			<ul className="flow-report-fixes">
				{rows.map((row) => (
					<li key={row.ref} className="flow-report-fix">
						<span className="flow-report-fix-what">{trimmed(row.title) || UNNAMED_FIX}</span>
						{trimmed(row.where) ? <code className="flow-report-fix-where">{trimmed(row.where)}</code> : null}
					</li>
				))}
			</ul>
			{left > 0 ? <p className="flow-report-said">{MORE_FIXES.replace("{count}", String(left))}</p> : null}
		</section>
	);
}
