import { createWidget, defineManifest, defineProp, useValue } from "widgetarium";
import { Icon, Pill } from "widgetarium/kit";

const CSS = `
.flow-project-card {
	container-type: inline-size;
	container-name: widget;
	display: flex;
	flex-direction: column;
	gap: var(--wg-gap-parts);
	min-width: 0;
}

.flow-project-card-said {
	margin: 0;
	font-size: var(--font-ui-small);
	color: var(--text-muted);
}

.flow-project-card-head {
	display: flex;
	align-items: center;
	gap: var(--wg-gap-parts);
	min-width: 0;
}

.flow-project-card-mark {
	display: grid;
	flex: none;
	place-content: center;
	width: 34px;
	height: 34px;
	border-radius: var(--wg-kit-plate) var(--wg-kit-plate) var(--wg-kit-plate) var(--wg-kit-pill);
	background: var(--wg-kit-fill);
	font-size: var(--font-ui-medium);
	line-height: 1;
}

.flow-project-card-names {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	gap: var(--size-2-1, 2px);
	min-width: 0;
}

.flow-project-card-name {
	overflow: hidden;
	margin: 0;
	white-space: nowrap;
	text-overflow: ellipsis;
	font-size: var(--font-ui-small);
	font-weight: var(--font-semibold);
	line-height: var(--line-height-tight);
}

.flow-project-card-repo {
	overflow: hidden;
	direction: rtl;
	white-space: nowrap;
	text-align: left;
	text-overflow: ellipsis;
	font-family: var(--font-monospace);
	font-size: var(--font-ui-smaller);
	color: var(--text-faint);
}

.flow-project-card-track {
	display: flex;
	align-items: center;
	gap: var(--wg-gap-parts);
	min-width: 0;
}

.flow-project-card-bar {
	overflow: hidden;
	flex: 1 1 auto;
	height: 6px;
	border-radius: var(--wg-kit-pill);
	background: var(--wg-kit-fill);
}

.flow-project-card-bar-fill {
	display: block;
	height: 100%;
	border-radius: var(--wg-kit-pill);
	background: var(--wg-kit-accent);
}

.flow-project-card-percent {
	flex: none;
	font-family: var(--font-monospace);
	font-size: var(--font-ui-smaller);
	color: var(--text-muted);
}

.flow-project-card-counts {
	display: flex;
	flex-wrap: nowrap;
	align-items: center;
	gap: var(--size-2-2, 4px);
	min-width: 0;
}

.flow-project-card .flow-project-card-count {
	flex: 0 1 auto;
	min-width: 0;
}

.flow-project-card-count-number {
	flex: none;
}

.flow-project-card-count-label {
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	font-weight: var(--font-normal);
}

.flow-project-card-touched {
	display: flex;
	align-items: center;
	gap: var(--size-2-2, 4px);
	min-width: 0;
	font-size: var(--font-ui-smaller);
	color: var(--text-faint);
}

.flow-project-card-touched-text {
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

@container widget (width < 200px) {
	.flow-project-card .flow-project-card-percent { display: none; }

	.flow-project-card .flow-project-card-mark {
		width: 26px;
		height: 26px;
	}
}
`;

const NOTHING = "No project bound to this card.";
const BLANK = "This project note names nothing this card can draw.";
const TOUCHED = "Touched {when}";

type Project = {
	mark?: string | null;
	name?: string | null;
	repository?: string | null;
	open?: number | string | null;
	doing?: number | string | null;
	done?: number | string | null;
	touched?: string | null;
};

const COUNTS = [
	{ field: "open", label: "open", tone: "neutral" },
	{ field: "doing", label: "doing", tone: "warning" },
	{ field: "done", label: "done", tone: "success" },
] as const;

type Counted = { field: string; label: string; tone: string; count: number };

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

type Head = { mark: string | null; name: string | null; repository: string | null };

function headOf(project: Project): Head | null {
	const mark = shownText(project.mark);
	const name = shownText(project.name);
	const repository = shownText(project.repository);
	if (mark === null && name === null && repository === null) return null;
	return { mark, name, repository };
}

function Mark({ mark }: { mark: string | null }) {
	if (mark === null) return null;
	return <span className="flow-project-card-mark">{mark}</span>;
}

function HeadRow({ head }: { head: Head }) {
	return (
		<div className="flow-project-card-head">
			<Mark mark={head.mark} />
			<div className="flow-project-card-names">
				{head.name === null ? null : (
					<h3 className="flow-project-card-name" title={head.name}>
						{head.name}
					</h3>
				)}
				{head.repository === null ? null : (
					<span className="flow-project-card-repo" title={head.repository}>
						<bdi dir="ltr">{head.repository}</bdi>
					</span>
				)}
			</div>
		</div>
	);
}

function Track({ percent }: { percent: number | null }) {
	if (percent === null) return null;
	return (
		<div className="flow-project-card-track">
			<span className="flow-project-card-bar">
				<i className="flow-project-card-bar-fill" style={{ width: `${percent}%` }} />
			</span>
			<span className="flow-project-card-percent">{percent}%</span>
		</div>
	);
}

function Counts({ counted }: { counted: Counted[] }) {
	if (counted.length === 0) return null;
	return (
		<div className="flow-project-card-counts">
			{counted.map((one) => (
				<Pill key={one.field} tone={one.tone} className="flow-project-card-count" title={one.label}>
					<b className="flow-project-card-count-number">{one.count}</b>
					<span className="flow-project-card-count-label">{one.label}</span>
				</Pill>
			))}
		</div>
	);
}

function Touched({ when }: { when: string | null }) {
	if (when === null) return null;
	return (
		<div className="flow-project-card-touched">
			<Icon name="clock" size={14} />
			<span className="flow-project-card-touched-text">{TOUCHED.replace("{when}", when)}</span>
		</div>
	);
}

function Said({ text }: { text: string }) {
	return <p className="flow-project-card-said">{text}</p>;
}

function Face({ project }: { project: Project | null }) {
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

export const manifest = defineManifest({
	title: "Project card",
	description: "One project as a card: its mark and name, the repository it lives in, how far it is and when it moved.",
	keywords: [
		"project",
		"card",
		"repository",
		"repo",
		"git",
		"progress",
		"counts",
		"open",
		"doing",
		"done",
		"detail",
		"tile",
	],
	role: "detail",
	size: { collapseBelowPx: 120, stackBelowPx: 200 },
	preview: {
		size: { w: 4, h: 2 },
		props: {
			project: {
				value: {
					mark: "🧩",
					name: "Widgetarium",
					repository: "~/Projects/Obsidian Plugins/widgetarium",
					open: 12,
					doing: 3,
					done: 48,
					touched: "2026-09-18",
				},
			},
		},
	},
	props: {
		project: defineProp<Project>()({
			label: "Project",
			hint: "The project this card draws. Held in a grid it is handed down; standing alone it is the one bound here.",
			default: {
				mark: "🧭",
				name: "Harbour",
				repository: "~/Projects/harbour",
				open: 4,
				doing: 1,
				done: 27,
				touched: "2026-09-11",
			},
		}),
	},
});

export default createWidget(manifest, ({ project }) => {
	return (
		<div className="flow-project-card">
			<style>{CSS}</style>
			<Face project={useValue<Project>(project)} />
		</div>
	);
});
