import { IQuery, createWidget, defineLayout, defineMetadata, z } from "widgetarium";
import { Icon, cn } from "widgetarium/kit";

const CSS = `
.wg-log-line {
	display: flex;
	align-items: flex-start;
	gap: var(--wg-gap-parts);
	min-width: 0;
}

.wg-log-line-mark {
	display: inline-flex;
	flex: none;
	align-items: center;
	justify-content: center;
	width: 20px;
	height: 20px;
	border-radius: var(--wg-kit-pill);
}

.wg-log-line-mark.is-neutral { color: var(--text-faint); }
.wg-log-line-mark.is-accent { background: var(--wg-kit-accent-wash); color: var(--wg-kit-accent); }
.wg-log-line-mark.is-success { background: var(--wg-kit-success-wash); color: var(--wg-kit-success); }
.wg-log-line-mark.is-error { background: var(--wg-kit-error-wash); color: var(--wg-kit-error); }

.wg-log-line-body {
	display: flex;
	flex: 1 1 auto;
	gap: var(--wg-gap-parts);
	min-width: 0;
}

.wg-log-line-at {
	flex: none;
	font-family: var(--font-monospace);
	font-size: var(--font-ui-smaller, 12px);
	font-variant-numeric: tabular-nums;
	line-height: var(--line-height-tight, 1.25);
	color: var(--text-faint);
}

.wg-log-line-text {
	flex: 1 1 auto;
	min-width: 0;
	overflow-wrap: anywhere;
	white-space: pre-wrap;
	font-family: var(--font-monospace);
	font-size: var(--font-ui-smaller, 12px);
	line-height: var(--line-height-tight, 1.25);
}

.wg-log-line-text.is-error { font-weight: var(--font-semibold, 600); color: var(--text-error); }
.wg-log-line-text.is-blank { color: var(--text-faint); font-style: italic; }

@container widget (width < 320px) {
	.wg-log-line .wg-log-line-body { flex-direction: column; }
}
`;

const BLANK = "(blank line)";
const ISO_DAY = /^\d{4}-\d{2}-\d{2}/;

const LogEntrySchema = z.object({
	at: z.string().nullish(),
	text: z.string().nullish(),
	tone: z.string().nullish(),
});

type Mark = { icon: string; markClass: string; textClass: string; said: string };

const MARKS: Record<string, Mark> = {
	neutral: { icon: "circle", markClass: "is-neutral", textClass: "", said: "Note" },
	accent: { icon: "pencil", markClass: "is-accent", textClass: "", said: "Write" },
	success: { icon: "circle-check", markClass: "is-success", textClass: "", said: "Done" },
	error: { icon: "triangle-alert", markClass: "is-error", textClass: "is-error", said: "Error" },
};

function markOf(tone: unknown): Mark {
	return MARKS[String(tone ?? "").toLowerCase()] ?? (MARKS.neutral as Mark);
}

function clockOf(at: unknown): string {
	const written = String(at ?? "").trim();
	if (!ISO_DAY.test(written)) return written;
	const when = new Date(written);
	if (Number.isNaN(when.getTime())) return written;
	return when.toLocaleTimeString();
}

const LogLine = createWidget({
	inject: {
		getEntry: IQuery.of(LogEntrySchema.default({ at: "14:32:07", text: "Session started.", tone: "neutral" })),
	},
	draw: ({ getEntry: entry }) => {
		const mark = markOf(entry.tone);
		const at = clockOf(entry.at);
		const text = String(entry.text ?? "").trim();

		return (
			<div className="wg-log-line">
				<style>{CSS}</style>
				<span className={cn("wg-log-line-mark", mark.markClass)} title={mark.said} aria-label={mark.said} role="img">
					<Icon name={mark.icon} size={14} />
				</span>
				<span className="wg-log-line-body">
					{at ? <time className="wg-log-line-at">{at}</time> : null}
					<span className={cn("wg-log-line-text", text ? mark.textClass : "is-blank")}>{text || BLANK}</span>
				</span>
			</div>
		);
	},
});

export const metadata = defineMetadata(LogLine, {
	title: "Log line",
	description: "One line of a running log: when it was written, what it says, and how it went.",
	keywords: [
		"log",
		"line",
		"entry",
		"output",
		"console",
		"terminal",
		"trace",
		"event",
		"message",
		"timestamp",
		"tail",
		"session",
	],
	preview: {
		size: { w: 5, h: 1 },
		props: {
			getEntry: {
				value: { at: "14:32:09", text: "wrote widgets/@flow/log-line/widget.tsx", tone: "accent" },
			},
		},
	},
	props: {
		getEntry: {
			label: "Entry",
			aka: ["entry"],
			hint: "The line this draws. Inside a log it is handed down; standing alone it is the one typed here.",
		},
	},
});

export const layout = defineLayout({
	role: "text",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 60, stackBelowPx: 320 },
});

export default LogLine;
