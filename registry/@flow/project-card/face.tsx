import { Counts } from "./counts";
import { HeadRow } from "./head-row";
import { Said } from "./said";
import { Touched } from "./touched";
import { Track } from "./track";
import type { Counted, Head, Project } from "./types";

const NOTHING = "No project bound to this card.";
const BLANK = "This project note names nothing this card can draw.";

const COUNTS = [
	{ field: "open", label: "open", tone: "neutral" },
	{ field: "doing", label: "doing", tone: "warning" },
	{ field: "done", label: "done", tone: "success" },
] as const;

export function Face({ project }: { project: Project | null }) {
	if (!project) return <Said text={NOTHING} />;
	const head = headOf(project);
	const percent = percentOf(project);
	const counted = countedIn(project);
	const touched = shownText(project.touched);
	if (!head && percent === null && counted.length === 0 && touched === null) return <Said text={BLANK} />;
	return (
		<>
			{head === null ? null : <HeadRow head={head} />}
			<Track percent={percent} />
			<Counts counted={counted} />
			<Touched when={touched} />
		</>
	);
}

function shownText(value: unknown): string | null {
	const said = String(value ?? "").trim();
	return said === "" ? null : said;
}

function countOf(value: unknown): number | null {
	if (value === undefined || value === null || value === "") return null;
	const number = Number(value);
	return Number.isFinite(number) ? number : null;
}

function countedIn(project: Project): Counted[] {
	const counted: Counted[] = [];
	for (const one of COUNTS) {
		const count = countOf(project[one.field]);
		if (count !== null) counted.push({ ...one, count });
	}
	return counted;
}

// TRADE-OFF: a count the note never wrote adds nothing to the total, so the bar reads high rather than not at all
function percentOf(project: Project): number | null {
	const done = countOf(project.done);
	const open = countOf(project.open);
	const doing = countOf(project.doing);
	if (done === null || (open === null && doing === null)) return null;
	const total = done + (open ?? 0) + (doing ?? 0);
	if (total <= 0) return null;
	return Math.round((done / total) * 100);
}

function headOf(project: Project): Head | null {
	const mark = shownText(project.mark);
	const name = shownText(project.name);
	const repository = shownText(project.repository);
	if (mark === null && name === null && repository === null) return null;
	return { mark, name, repository };
}
