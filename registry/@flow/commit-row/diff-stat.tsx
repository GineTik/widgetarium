import { RowValue } from "widgetarium/kit";
import { COUNT, countOf } from "./counts";
import { DiffBar } from "./diff-bar";
import type { Commit } from "./types";

const ADDED = "+{count}";
const REMOVED = "-{count}";

export function DiffStat({ commit }: { commit: Commit }) {
	const added = countOf(commit.added);
	const removed = countOf(commit.removed);
	if (added === null && removed === null) return null;

	return (
		<RowValue className="fcr-diff">
			{added === null ? null : <span className="fcr-added">{ADDED.replace(COUNT, String(added))}</span>}
			{removed === null ? null : <span className="fcr-removed">{REMOVED.replace(COUNT, String(removed))}</span>}
			<DiffBar added={added} removed={removed} />
		</RowValue>
	);
}
