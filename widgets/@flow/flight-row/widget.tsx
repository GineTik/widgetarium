import { createWidget, defineManifest, defineProp, useValue } from "widgetarium";
import { Pill, Row, RowLabel, RowValue, cx } from "widgetarium/kit";

const CSS = `
:is(.wg-root, .wg-portal) .wg-kit-row.flow-row {
	--flow-stage-w: 88px;
	--flow-time-w: 48px;
	--flow-face-w: 24px;
	flex-wrap: wrap;
	row-gap: var(--size-2-1, 2px);
	padding: 0;
	min-width: 0;
}

.flow-row-mark {
	order: 0;
	flex: none;
	box-sizing: border-box;
	width: 10px;
	height: 10px;
	border-radius: var(--wg-kit-pill);
	background: var(--wg-kit-neutral);
}

.flow-row-mark.is-running { background: var(--wg-kit-accent); }

.flow-row-mark.is-waiting {
	background: transparent;
	border: 2px solid var(--wg-kit-info);
}

.flow-row-mark.is-blocked {
	border-radius: 0;
	background: var(--wg-kit-warning);
}

.flow-row-mark.is-failed {
	border-radius: 0;
	background: transparent;
	border: 2px solid var(--wg-kit-error);
}

.flow-row-mark.is-done {
	border-radius: 0;
	background: var(--wg-kit-success);
	transform: rotate(45deg);
}

.flow-row-under { display: contents; }

.flow-row-meta {
	order: 1;
	display: flex;
	flex: 1 1 100%;
	align-items: center;
	gap: var(--size-2-2, 4px);
	overflow: hidden;
	min-width: 0;
	font-size: var(--font-ui-smaller, 12px);
	line-height: var(--line-height-tight, 1.25);
	color: var(--text-faint);
}

.flow-row-part {
	overflow: hidden;
	flex: 0 1 auto;
	min-width: 0;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.flow-row-part.is-branch { font-family: var(--font-monospace); }

.flow-row-sep { flex: none; }

.flow-row-cell {
	display: flex;
	overflow: hidden;
	align-items: center;
	min-width: 0;
}

.flow-row-cell.is-stage { width: var(--flow-stage-w); }

.flow-row-cell.is-time {
	justify-content: flex-end;
	width: var(--flow-time-w);
	white-space: nowrap;
	font-family: var(--font-monospace);
	font-size: var(--font-ui-smaller, 12px);
}

.flow-row-cell.is-face {
	justify-content: flex-end;
	width: var(--flow-face-w);
}

.flow-row-face {
	display: grid;
	place-content: center;
	box-sizing: border-box;
	width: var(--flow-face-w);
	height: var(--flow-face-w);
	border-radius: var(--wg-kit-pill);
	background: var(--wg-kit-fill);
	font-size: var(--font-ui-smaller, 12px);
	font-weight: var(--font-semibold, 600);
}

@container widget (width < 420px) {
	:is(.wg-root, .wg-portal) .wg-kit-row.flow-row .flow-row-under {
		order: 1;
		display: flex;
		flex: 1 1 100%;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--size-2-2, 4px);
		min-width: 0;
	}

	.flow-row-under .flow-row-meta {
		order: 0;
		flex: 0 1 auto;
	}

	:is(.wg-root, .wg-portal) .flow-row .flow-row-under .wg-kit-row-value { flex: 0 1 auto; }

	.flow-row-under .flow-row-cell { width: auto; }

	.flow-row-under .flow-row-cell:empty { display: none; }
}
`;

const UNTITLED = "Untitled";
const SEPARATOR = "·";

const STATUS_SHAPES: Record<string, string> = {
	running: "is-running",
	waiting: "is-waiting",
	queued: "is-waiting",
	blocked: "is-blocked",
	failed: "is-failed",
	done: "is-done",
};

const STATUS_LABELS: Record<string, string> = {
	running: "Running",
	waiting: "Waiting",
	queued: "Queued",
	blocked: "Blocked",
	failed: "Failed",
	done: "Done",
};

const STAGE_TONES: Record<string, string> = {
	plan: "info",
	build: "accent",
	review: "warning",
	test: "note",
	ship: "success",
	blocked: "error",
	failed: "error",
};

type Flight = {
	title?: string;
	status?: string;
	stage?: string;
	project?: string;
	branch?: string;
	activity?: string;
	elapsed?: string;
	who?: string;
};

function textOf(value: unknown): string | undefined {
	if (value === undefined || value === null) return undefined;
	const said = String(value).trim();
	return said === "" ? undefined : said;
}

function initialOf(who: string | undefined): string | undefined {
	return who === undefined ? undefined : who.charAt(0).toUpperCase();
}

function Mark({ status }: { status: string | undefined }) {
	const key = status?.toLowerCase() ?? "";
	const label = STATUS_LABELS[key] ?? status;
	return <span className={cx("flow-row-mark", STATUS_SHAPES[key])} role="img" aria-label={label} title={label} />;
}

function Meta({ flight }: { flight: Flight }) {
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

// TRADE-OFF: a cell is drawn empty rather than dropped — a dropped one moves the column under it
function Trail({ flight }: { flight: Flight }) {
	const stage = textOf(flight.stage);
	const elapsed = textOf(flight.elapsed);
	const initial = initialOf(textOf(flight.who));

	return (
		<RowValue>
			<span className="flow-row-cell is-stage">
				{stage === undefined ? null : <Pill tone={STAGE_TONES[stage.toLowerCase()] ?? "neutral"}>{stage}</Pill>}
			</span>
			<span className="flow-row-cell is-time">{elapsed}</span>
			<span className="flow-row-cell is-face">
				{initial === undefined ? null : (
					<span className="flow-row-face" aria-label={flight.who} title={flight.who}>
						{initial}
					</span>
				)}
			</span>
		</RowValue>
	);
}

export const manifest = defineManifest({
	title: "Flight row",
	description: "One piece of work in flight: where it stands, what it is doing, how long it has been going.",
	keywords: [
		"flight",
		"row",
		"run",
		"job",
		"task",
		"status",
		"stage",
		"branch",
		"project",
		"elapsed",
		"activity",
		"agent",
		"pipeline",
		"build",
	],
	role: "detail",
	size: { collapseBelowPx: 160, stackBelowPx: 420 },
	preview: {
		size: { w: 5, h: 1 },
		props: {
			flight: {
				value: {
					title: "Rewrite the board tree reader",
					status: "running",
					stage: "build",
					project: "widgetarium",
					branch: "unsafe-dev",
					activity: "compiling widgets",
					elapsed: "12m",
					who: "Dana Reid",
				},
			},
		},
	},
	props: {
		flight: defineProp<Flight>()({
			label: "Flight",
			hint: "The work this row draws. Held in a list it is handed down; standing alone it is the one typed here.",
			default: {
				title: "Rewrite the board tree reader",
				status: "running",
				stage: "build",
				project: "widgetarium",
				branch: "unsafe-dev",
				activity: "compiling widgets",
				elapsed: "12m",
				who: "Dana Reid",
			},
		}),
	},
});

// TRADE-OFF: the kit row's own padding is dropped, because the item plate around it already pads
export default createWidget(manifest, ({ flight }) => {
	const shown: Flight = useValue(flight) ?? {};
	const title = textOf(shown.title) ?? UNTITLED;

	return (
		<Row className="flow-row">
			<style>{CSS}</style>
			<Mark status={textOf(shown.status)} />
			<RowLabel title={title}>{title}</RowLabel>
			<div className="flow-row-under">
				<Meta flight={shown} />
				<Trail flight={shown} />
			</div>
		</Row>
	);
});
