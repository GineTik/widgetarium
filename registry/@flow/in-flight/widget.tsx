import {
	IListGateway,
	ISlot,
	IValueGateway,
	VaultRecordSchema,
	canDo,
	createWidget,
	defineLayout,
	defineMetadata,
	useData,
	z,
} from "widgetarium";
import type { Row } from "widgetarium";
import { SlotList } from "widgetarium/kit";
import { InFlightSaid } from "./in-flight-said";
import { MoreRow } from "./more-row";
import { PickedRow } from "./picked-row";
import { CSS } from "./style";
import type { FlightFace, RowSlot } from "./types";
import { useNow } from "./use-now";
import { useShown } from "./use-shown";

const PAGE_SIZE = 12;

const NO_SLOT = "This list has no widget to draw its rows with.";
const NOTHING = "Nothing is in flight right now.";

const SPANS = [
	{ under: 60, per: 1, mark: "s" },
	{ under: 3600, per: 60, mark: "m" },
	{ under: 86400, per: 3600, mark: "h" },
	{ under: Number.POSITIVE_INFINITY, per: 86400, mark: "d" },
];

const FlightSchema = VaultRecordSchema.extend({
	title: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["summary", "headline"] }),
	status: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["state", "result"] }),
	stage: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["phase", "step"] }),
	project: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["repo", "repository"] }),
	branch: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["head", "gitBranch"] }),
	activity: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["doing", "detail"] }),
	startedAt: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["started", "since", "begun"] }),
	elapsed: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["duration", "runtime"] }),
	who: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["owner", "assignee", "agent"] }),
});

type FlightRecord = z.infer<typeof FlightSchema>;

type FlightRow = Row<FlightRecord>;

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

function pageSizeOf(pageSize: number) {
	const asked = Math.round(Number(pageSize));
	return asked > 0 ? asked : PAGE_SIZE;
}

function saidInstead(
	slot: RowSlot | undefined,
	listed: { failure: string | null; isLoading: boolean; total: number | null },
) {
	if (!slot) return NO_SLOT;
	if (listed.failure) return listed.failure;
	return !listed.isLoading && listed.total === 0 ? NOTHING : null;
}

const InFlight = createWidget({
	inject: {
		flights: IListGateway.of(FlightSchema, { sort: [{ prop: "startedAt", dir: "desc" }] }),
		selection: IValueGateway.of(z.string().nullable()).pick("get", "update"),
		pageSize: IValueGateway.of(z.number().default(PAGE_SIZE)).pick("get"),
		row: ISlot.of<{ flight: FlightFace }>({
			default: "@flow/flight-row",
			surface: "group",
			gives: { flight: ["title", "status", "stage", "project", "branch", "activity", "elapsed", "who"] },
		}),
	},
	draw: ({ flights, pageSize, selection, row: Drawn }) => {
		const size = pageSizeOf(pageSize);
		const { shown, more } = useShown(size, flights.id);
		const listed = useData(flights.list, { offset: 0, limit: shown });
		const picked = selection.value;
		const now = useNow();
		const said = saidInstead(Drawn, listed);
		if (said || !Drawn) return <InFlightSaid text={said ?? NO_SLOT} />;

		const rows = listed.data;
		const canPick = canDo(selection.update);

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
	},
});

export const metadata = defineMetadata(InFlight, {
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
		flights: {
			label: "Flights",
			hint: "One record per piece of work in flight. The newest start is drawn first.",
			describes: {
				title: { label: "Title", type: "line" },
				status: { label: "Status", type: "line" },
				stage: { label: "Stage", type: "line" },
				project: { label: "Project", type: "line" },
				branch: { label: "Branch", type: "line" },
				activity: { label: "Activity", type: "line" },
				startedAt: { label: "Started at", type: "datetime" },
				elapsed: { label: "Elapsed", type: "line" },
				who: { label: "Who", type: "line" },
			},
		},
		selection: {
			label: "Selected flight",
			hint: "Which row is picked. A detail tile that picks from the same list follows it.",
			source: { implementation: "@core/selection", fields: { rows: "flights" } },
		},
		pageSize: {
			label: "Rows per page",
			hint: "How many rows are read at once, and how many more each press adds.",
		},
	},
});

export const layout = defineLayout({
	role: "collection",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 240, stackBelowPx: 420 },
});

export default InFlight;
