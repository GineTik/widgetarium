import { useEffect, useState } from "react";
import { canDo, createWidget, defineManifest, defineProp, useData } from "widgetarium";
import type { Row, Slot, VaultRecord, WidgetProps } from "widgetarium";
import { Button, SlotList } from "widgetarium/kit";

const CSS = `
.flow-inflight {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	gap: var(--wg-gap-items);
	min-width: 0;
	min-height: 0;
	overflow: auto;
}

.flow-inflight-said {
	margin: 0;
	font-size: var(--font-ui-small, 14px);
	color: var(--wg-kit-text-muted);
}

.flow-inflight-more {
	display: flex;
	flex: none;
	justify-content: center;
}

.flow-inflight-pick {
	position: relative;
	border-radius: var(--wg-kit-plate);
	cursor: pointer;
}

.flow-inflight-pick[aria-pressed="true"] {
	outline: 2px solid var(--wg-kit-accent);
	outline-offset: -2px;
}

.flow-inflight-pick[aria-pressed="true"]::before {
	content: "";
	position: absolute;
	z-index: 1;
	top: 25%;
	bottom: 25%;
	left: 0;
	width: 3px;
	border-radius: var(--wg-kit-pill);
	background: var(--wg-kit-accent);
}

.flow-inflight-pick:focus-visible {
	outline: 2px solid var(--wg-kit-accent);
	outline-offset: 2px;
}
`;

const PAGE_SIZE = 12;
const TICK_MS = 30000;
const NO_SLOT = "This list has no widget to draw its rows with.";
const NOTHING = "Nothing is in flight right now.";
const SHOW_MORE = "Show more ({rest} left)";

const SPANS = [
	{ under: 60, per: 1, mark: "s" },
	{ under: 3600, per: 60, mark: "m" },
	{ under: 86400, per: 3600, mark: "h" },
	{ under: Number.POSITIVE_INFINITY, per: 86400, mark: "d" },
];

type FlightRecord = VaultRecord & {
	title?: string;
	status?: string;
	stage?: string;
	project?: string;
	branch?: string;
	activity?: string;
	startedAt?: string;
	elapsed?: string;
	who?: string;
};

type FlightFace = {
	title: string | undefined;
	status: string | undefined;
	stage: string | undefined;
	project: string | undefined;
	branch: string | undefined;
	activity: string | undefined;
	elapsed: string | undefined;
	who: string | undefined;
};

type FlightRow = Row<FlightRecord>;
type RowSlot = Slot<{ flight: FlightFace }>;
type Drawn = NonNullable<RowSlot>;
type InFlightProps = WidgetProps<typeof manifest>;

function textOf(value: unknown): string | undefined {
	if (value === undefined || value === null) return undefined;
	const said = String(value).trim();
	return said === "" ? undefined : said;
}

function sinceOf(startedAt: unknown, now: number): string | undefined {
	const began = Date.parse(String(startedAt ?? ""));
	if (!Number.isFinite(began)) return undefined;
	const seconds = Math.max(0, Math.round((now - began) / 1000));
	const span = SPANS.find((one) => seconds < one.under);
	if (!span) return undefined;
	return `${Math.floor(seconds / span.per)}${span.mark}`;
}

function faceOf(row: FlightRow, now: number): FlightFace {
	return {
		title: textOf(row.title) ?? textOf(row.name),
		status: textOf(row.status),
		stage: textOf(row.stage),
		project: textOf(row.project),
		branch: textOf(row.branch),
		activity: textOf(row.activity),
		elapsed: textOf(row.elapsed) ?? sinceOf(row.startedAt, now),
		who: textOf(row.who),
	};
}

function usePageSize(pageSize: InFlightProps["pageSize"]) {
	const asked = Math.round(Number(useData(pageSize.get).data));
	return asked > 0 ? asked : PAGE_SIZE;
}

function useShown(size: number, source: string) {
	const [shown, setShown] = useState(size);
	useEffect(() => setShown(size), [size, source]);
	return { shown, more: () => setShown(shown + size) };
}

function useNow() {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const beat = setInterval(() => setNow(Date.now()), TICK_MS);
		return () => clearInterval(beat);
	}, []);
	return now;
}

function saidInstead(
	slot: RowSlot | undefined,
	listed: { failure: string | null; isLoading: boolean; total: number | null },
) {
	if (!slot) return NO_SLOT;
	if (listed.failure) return listed.failure;
	return !listed.isLoading && listed.total === 0 ? NOTHING : null;
}

function InFlightSaid({ text }: { text: string }) {
	return (
		<div className="flow-inflight">
			<style>{CSS}</style>
			<p className="flow-inflight-said">{text}</p>
		</div>
	);
}

function MoreRow({ rest, onMore }: { rest: number; onMore: () => void }) {
	if (rest <= 0) return null;
	return (
		<div className="flow-inflight-more">
			<Button onClick={onMore}>{SHOW_MORE.replace("{rest}", String(rest))}</Button>
		</div>
	);
}

type PickProps = {
	Drawn: Drawn;
	face: FlightFace;
	isPicked: boolean;
	onPick: (() => void) | null;
};

function PickedRow({ Drawn, face, isPicked, onPick }: PickProps) {
	if (!onPick) return <Drawn flight={face} />;
	return (
		<div
			className="flow-inflight-pick"
			role="button"
			tabIndex={0}
			aria-pressed={isPicked}
			onClick={onPick}
			onKeyDown={(event) => {
				if (event.key !== "Enter" && event.key !== " ") return;
				event.preventDefault();
				onPick();
			}}
		>
			<Drawn flight={face} />
		</div>
	);
}

export const manifest = defineManifest({
	title: "In flight",
	description: "The work running right now, one row apiece, the most recently started at the top.",
	keywords: [
		"flight",
		"running",
		"active",
		"now",
		"queue",
		"jobs",
		"runs",
		"builds",
		"agents",
		"pipeline",
		"status",
		"live",
		"list",
	],
	role: "collection",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 240, stackBelowPx: 420 },
	slots: {
		row: {
			of: "widget",
			default: "@flow/flight-row",
			surface: "group",
			gives: { flight: ["title", "status", "stage", "project", "branch", "activity", "elapsed", "who"] },
		},
	},
	preview: {
		size: { w: 6, h: 4 },
		props: {
			flights: {
				rows: [
					{
						path: "preview/flight-1.md",
						title: "Rewrite the board tree reader",
						status: "running",
						stage: "build",
						project: "widgetarium",
						branch: "unsafe-dev",
						activity: "compiling widgets",
						elapsed: "12m",
						who: "Dana Reid",
					},
					{
						path: "preview/flight-2.md",
						title: "Port the settings window to the kit",
						status: "waiting",
						stage: "review",
						project: "widgetarium",
						branch: "kit-settings",
						activity: "waiting on review",
						elapsed: "1h",
						who: "Mia Tan",
					},
					{
						path: "preview/flight-3.md",
						title: "Catalogue install from a local registry",
						status: "blocked",
						stage: "plan",
						project: "widgetarium",
						activity: "needs a curator list",
						elapsed: "3h",
					},
					{
						path: "preview/flight-4.md",
						title: "Paint tests against headless Chrome",
						status: "failed",
						stage: "test",
						project: "widgetarium",
						branch: "paint-gate",
						elapsed: "2d",
						who: "Theo Ruiz",
					},
					{
						path: "preview/flight-5.md",
						title: "Lay the agent files into a vault",
						status: "done",
						stage: "ship",
						project: "widgetarium",
						branch: "agent-files",
						activity: "installed",
						elapsed: "4d",
						who: "Alex Morgan",
					},
				],
			},
		},
	},
	props: {
		flights: defineProp<FlightRecord[]>()({
			label: "Flights",
			hint: "One record per piece of work in flight. The newest start is drawn first.",
			default: [],
			sort: [{ prop: "startedAt", dir: "desc" }],
			describes: {
				title: { label: "Title", type: "line", aka: ["summary", "headline"] },
				status: { label: "Status", type: "line", aka: ["state", "result"] },
				stage: { label: "Stage", type: "line", aka: ["phase", "step"] },
				project: { label: "Project", type: "line", aka: ["repo", "repository"] },
				branch: { label: "Branch", type: "line", aka: ["head", "gitBranch"] },
				activity: { label: "Activity", type: "line", aka: ["doing", "detail"] },
				startedAt: { label: "Started at", type: "datetime", aka: ["started", "since", "begun"] },
				elapsed: { label: "Elapsed", type: "line", aka: ["duration", "runtime"] },
				who: { label: "Who", type: "line", aka: ["owner", "assignee", "agent"] },
			},
		}),
		selection: defineProp<string | null>()({
			label: "Selected flight",
			hint: "Which row is picked. A detail tile that picks from the same list follows it.",
			of: "flights",
			writes: ["update"],
		}),
		pageSize: defineProp<number>()({
			label: "Rows per page",
			hint: "How many rows are read at once, and how many more each press adds.",
			default: PAGE_SIZE,
		}),
	},
});

export default createWidget(manifest, ({ flights, pageSize, selection, slots }) => {
	const size = usePageSize(pageSize);
	const { shown, more } = useShown(size, flights.id);
	const listed = useData(flights.list, { offset: 0, limit: shown });
	const picked = useData(selection.get).data;
	const now = useNow();
	const said = saidInstead(slots?.row as RowSlot, listed);
	if (said) return <InFlightSaid text={said} />;

	const rows = listed.data;
	const canPick = canDo(selection.update);
	const Drawn = slots?.row as Drawn;

	return (
		<div className="flow-inflight">
			<style>{CSS}</style>
			<SlotList slot={Drawn}>
				{rows.map((row: FlightRow) => (
					<PickedRow
						key={row.ref}
						Drawn={Drawn}
						face={faceOf(row, now)}
						isPicked={row.ref === picked}
						onPick={canPick ? () => selection.update(row.ref === picked ? null : row.ref) : null}
					/>
				))}
			</SlotList>
			<MoreRow rest={(listed.total ?? rows.length) - rows.length} onMore={more} />
		</div>
	);
});
