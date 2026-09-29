import { textOf } from "./text-of";
import type { Flight } from "./types";

const SEPARATOR = "·";

export function Meta({ flight }: { flight: Flight }) {
	const parts = [
		{ key: "project", className: "flow-row-part", text: textOf(flight.project) },
		{ key: "branch", className: "flow-row-part is-branch", text: textOf(flight.branch) },
		{ key: "activity", className: "flow-row-part", text: textOf(flight.activity) },
	].filter((part) => part.text !== undefined);

	return (
		<div className="flow-row-meta">
			{parts.flatMap((part, at) => [
				at === 0 ? null : (
					<span key={`${part.key}-sep`} className="flow-row-sep" aria-hidden="true">
						{SEPARATOR}
					</span>
				),
				<span key={part.key} className={part.className} title={part.text}>
					{part.text}
				</span>,
			])}
		</div>
	);
}
