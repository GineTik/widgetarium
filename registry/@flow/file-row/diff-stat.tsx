import { RowValue } from "widgetarium/kit";
import { DiffBar } from "./diff-bar";
import { KINDS } from "./kinds";
import type { FileChange, Kind } from "./types";

const BINARY = "binary";
const NOT_COUNTED = "not counted";

const ADDED = "+{count}";
const REMOVED = "−{count}";
const COUNT = "{count}";

export function DiffStat({ file, kind }: { file: FileChange; kind: Kind }) {
	const added = countOf(file.added);
	const removed = countOf(file.removed);
	const said = saidInsteadOfCounts(kind, added, removed);
	return said ? (
		<RowValue className="ffr-stat ffr-said">{said}</RowValue>
	) : (
		<RowValue className="ffr-stat">
			{added === null ? null : <span className="ffr-added">{ADDED.replace(COUNT, String(added))}</span>}
			{removed === null ? null : <span className="ffr-removed">{REMOVED.replace(COUNT, String(removed))}</span>}
			<DiffBar added={added} removed={removed} />
		</RowValue>
	);
}

function countOf(value: unknown): number | null {
	if (value === undefined || value === null || value === "") return null;
	const number = Number(value);
	if (!Number.isFinite(number)) return null;
	return Math.max(0, Math.round(number));
}

function saidInsteadOfCounts(kind: Kind, added: number | null, removed: number | null): string | null {
	if (kind === KINDS.binary) return BINARY;
	if (added === null && removed === null) return NOT_COUNTED;
	return null;
}
