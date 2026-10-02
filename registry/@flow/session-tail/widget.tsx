import {
	IListGateway,
	ISlot,
	IValueGateway,
	createWidget,
	defineLayout,
	defineMetadata,
	defineProps,
	useData,
	z,
} from "widgetarium";
import type { Row } from "widgetarium";
import { TailPatience } from "./tail-patience";
import { TailRows } from "./tail-rows";
import { TailSaid } from "./tail-said";
import type { LogLine } from "./types";
import { usePatience } from "./use-patience";

const LINES_KEPT = 200;
const LINES_CEILING = 1000;

const NO_SLOT = "This log has no widget to draw its lines with.";
const NOTHING_YET = "Nothing has been written here yet — the log fills as the session runs.";

export const LogLineSchema = z.object({
	at: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["time", "timestamp", "when", "ts", "date"] }),
	text: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["line", "message", "body", "content", "output"] }),
	tone: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["level", "kind", "severity", "status", "result"] }),
});

export const props = defineProps({
	lines: IListGateway.of(LogLineSchema, {
		sort: [{ prop: "at", dir: "desc" }],
		default: [
			{ at: "14:32:09", text: "wrote widgets/@flow/log-line/widget.tsx", tone: "accent" },
			{ at: "14:32:04", text: "tsc --noEmit: no errors", tone: "success" },
			{ at: "14:31:52", text: "Session started.", tone: "neutral" },
		],
	}),
	linesKept: IValueGateway.of(z.number().default(LINES_KEPT)).pick("get"),
	following: IValueGateway.of(z.boolean().default(true)).pick("get", "update"),
	line: ISlot.of<{ getEntry: Row<LogLine> }>({
		default: "@flow/log-line",
		surface: "none",
		gives: { getEntry: ["at", "text", "tone"] },
	}),
});

const SessionTail = createWidget({
	inject: props,
	draw: ({ lines, linesKept, following, line }) => {
		const kept = keptOf(linesKept);
		const read = useData(lines.list, { limit: kept });
		const patience = usePatience(read.isLoading);

		if (!line) return <TailSaid text={NO_SLOT} />;
		if (read.failure) return <TailSaid text={read.failure} />;
		if (read.data.length > 0)
			return <TailRows rows={read.data as Row<LogLine>[]} total={read.total} following={following} Line={line} />;
		if (!read.isLoading) return <TailSaid text={NOTHING_YET} />;
		return <TailPatience stage={patience.stage} seconds={patience.seconds} />;
	},
});

export const metadata = defineMetadata(SessionTail, {
	title: "Session tail",
	description: "A running log read from its end: the newest line stands at the bottom and the view follows it.",
	keywords: [
		"log",
		"tail",
		"session",
		"console",
		"output",
		"terminal",
		"stream",
		"trace",
		"live",
		"follow",
		"activity",
		"events",
	],
	preview: {
		size: { w: 5, h: 4 },
		props: {
			lines: {
				rows: [
					{ at: "14:32:11", text: "3 files changed, 218 insertions(+)", tone: "success" },
					{ at: "14:32:09", text: "wrote widgets/@flow/log-line/widget.tsx", tone: "accent" },
					{ at: "14:32:04", text: "tsc --noEmit: no errors", tone: "success" },
					{ at: "14:31:58", text: "ENOENT: widgets/@flow/session-tail/build/widget.js", tone: "error" },
					{ at: "14:31:52", text: "Session started.", tone: "neutral" },
				],
			},
		},
	},
	props: {
		lines: {
			label: "Lines",
			hint: "The log this draws, newest first. Each row is one line: when it was written, what it says, how it went.",
			describes: {
				at: { label: "Time", type: "text" },
				text: { label: "Text", type: "text" },
				tone: { label: "Tone", type: "text" },
			},
		},
		linesKept: {
			label: "Lines kept",
			hint: "How many of the newest lines are held on screen. Older ones stay in the source and are counted, not drawn.",
		},
		following: {
			keep: "screen",
			label: "Follow the newest line",
			hint: "Whether the view sticks to the end. It lets go when the reader scrolls away and takes hold again on a press.",
		},
	},
});

export const layout = defineLayout({
	role: "collection",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 120, stackBelowPx: 320 },
});

export default SessionTail;

function keptOf(linesKept: number) {
	const asked = Math.round(Number(linesKept));
	if (!Number.isFinite(asked) || asked <= 0) return LINES_KEPT;
	return Math.min(asked, LINES_CEILING);
}
