import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createWidget, defineManifest, defineProp, useData } from "widgetarium";
import type { Row, Slot, WidgetProps } from "widgetarium";
import { Button, Count, Icon, SlotList } from "widgetarium/kit";

const CSS = `
.wg-tail {
	position: relative;
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	min-width: 0;
	min-height: 0;
}

.wg-tail-scroll {
	flex: 1 1 auto;
	min-width: 0;
	min-height: 0;
	overflow-x: hidden;
	overflow-y: auto;
	overscroll-behavior: contain;
}

.wg-tail-scroll > .wg-kit-slot-list {
	justify-content: flex-end;
	min-height: 100%;
}

.wg-tail-said {
	margin: auto 0 0;
	color: var(--wg-kit-text-muted);
}

.wg-tail-waiting {
	display: flex;
	align-items: center;
	gap: var(--wg-gap-parts);
	margin: auto 0 0;
	min-width: 0;
	color: var(--wg-kit-text-muted);
}

.wg-tail-turn {
	flex: none;
	box-sizing: border-box;
	width: 18px;
	height: 18px;
	border: 2px solid var(--wg-kit-fill);
	border-top-color: var(--wg-kit-accent);
	border-radius: var(--wg-kit-pill);
	animation: wg-tail-turning 900ms linear infinite;
}

.wg-tail-track {
	overflow: hidden;
	flex: none;
	width: 96px;
	height: 4px;
	border-radius: var(--wg-kit-pill);
	background: var(--wg-kit-fill);
}

.wg-tail-sweep {
	display: block;
	width: 40%;
	height: 100%;
	border-radius: var(--wg-kit-pill);
	background: var(--wg-kit-accent);
	animation: wg-tail-sweeping 1400ms ease-in-out infinite;
}

.wg-tail-back {
	position: absolute;
	right: 0;
	bottom: 0;
	left: 0;
	display: flex;
	justify-content: center;
	pointer-events: none;
}

.wg-tail-back > * { pointer-events: auto; }

@keyframes wg-tail-turning {
	to { transform: rotate(360deg); }
}

@keyframes wg-tail-sweeping {
	from { transform: translateX(-110%); }
	to { transform: translateX(260%); }
}

@media (prefers-reduced-motion: reduce) {
	.wg-tail-turn, .wg-tail-sweep { animation: none; }
}
`;

const LINES_KEPT = 200;
const LINES_CEILING = 1000;
const STICK_SLACK_PX = 8;
const PATIENT_MS = 200;
const SLOW_MS = 5000;

const NO_SLOT = "This log has no widget to draw its lines with.";
const NOTHING_YET = "Nothing has been written here yet — the log fills as the session runs.";
const READING = "Reading the log…";
const STILL_READING = "Still reading the log — {seconds}s so far.";
const BACK_TO_END = "Jump to the newest line";
const LIVE_LOG = "Session log";

type Stage = "quiet" | "waiting" | "slow";

type LogLine = { at?: string | null; text?: string | null; tone?: string | null };

type TailProps = WidgetProps<typeof manifest>;

type LineSlot = Slot<{ entry: Row<LogLine> }>;

type Drawn = NonNullable<LineSlot>;

export const manifest = defineManifest({
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
	role: "collection",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 120, stackBelowPx: 320 },
	slots: {
		line: {
			of: "widget",
			default: "@flow/log-line",
			surface: "none",
			gives: { entry: ["at", "text", "tone"] },
		},
	},
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
		lines: defineProp<LogLine[]>()({
			label: "Lines",
			hint: "The log this draws, newest first. Each row is one line: when it was written, what it says, how it went.",
			default: [
				{ at: "14:32:09", text: "wrote widgets/@flow/log-line/widget.tsx", tone: "accent" },
				{ at: "14:32:04", text: "tsc --noEmit: no errors", tone: "success" },
				{ at: "14:31:52", text: "Session started.", tone: "neutral" },
			],
			sort: [{ prop: "at", dir: "desc" }],
			describes: {
				at: { label: "Time", type: "text", aka: ["time", "timestamp", "when", "ts", "date"] },
				text: { label: "Text", type: "text", aka: ["line", "message", "body", "content", "output"] },
				tone: { label: "Tone", type: "text", aka: ["level", "kind", "severity", "status", "result"] },
			},
		}),
		linesKept: defineProp<number>()({
			label: "Lines kept",
			hint: "How many of the newest lines are held on screen. Older ones stay in the source and are counted, not drawn.",
			default: LINES_KEPT,
		}),
		following: defineProp<boolean>()({
			label: "Follow the newest line",
			hint: "Whether the view sticks to the end. It lets go when the reader scrolls away and takes hold again on a press.",
			keep: "screen",
			default: true,
			writes: ["update"],
		}),
	},
});

export default createWidget(manifest, ({ lines, linesKept, following, slots }) => {
	const kept = useKept(linesKept);
	const read = useData(lines.list, { limit: kept });
	const patience = usePatience(read.isLoading);
	const slot = (slots?.line ?? null) as LineSlot;

	if (!slot) return <TailSaid text={NO_SLOT} />;
	if (read.failure) return <TailSaid text={read.failure} />;
	if (read.data.length > 0)
		return (
			<TailRows rows={read.data as Row<LogLine>[]} total={read.total} following={following} Line={slot as Drawn} />
		);
	if (!read.isLoading) return <TailSaid text={NOTHING_YET} />;
	return <TailPatience stage={patience.stage} seconds={patience.seconds} />;
});

function useKept(linesKept: TailProps["linesKept"]) {
	const asked = Math.round(Number(useData(linesKept.get).data));
	if (!Number.isFinite(asked) || asked <= 0) return LINES_KEPT;
	return Math.min(asked, LINES_CEILING);
}

function usePatience(isLoading: boolean) {
	const [stage, setStage] = useState<Stage>("quiet");
	const [seconds, setSeconds] = useState(0);

	useEffect(() => {
		setStage("quiet");
		setSeconds(0);
		if (!isLoading) return undefined;
		const startedAt = Date.now();
		const patient = setTimeout(() => setStage("waiting"), PATIENT_MS);
		const slow = setTimeout(() => setStage("slow"), SLOW_MS);
		const tick = setInterval(() => setSeconds(Math.round((Date.now() - startedAt) / 1000)), 1000);
		return () => {
			clearTimeout(patient);
			clearTimeout(slow);
			clearInterval(tick);
		};
	}, [isLoading]);

	return { stage, seconds };
}

function useFollowing(following: TailProps["following"]) {
	const isFollowing = useData(following.get).data !== false;
	const setFollowing = useCallback(
		(wanted: boolean) => {
			if (wanted !== isFollowing) void following.update(wanted);
		},
		[following, isFollowing],
	);
	return { isFollowing, setFollowing };
}

function useStuckToEnd(isFollowing: boolean, end: string, onEndness: (atEnd: boolean) => void) {
	const scroller = useRef<HTMLDivElement>(null);

	const stick = useCallback(() => {
		const node = scroller.current;
		if (node) node.scrollTop = node.scrollHeight;
	}, []);

	useLayoutEffect(() => {
		if (isFollowing) stick();
	}, [isFollowing, end, stick]);

	useEffect(() => {
		const node = scroller.current;
		if (!node) return undefined;
		const watcher = new ResizeObserver(() => {
			if (isFollowing) stick();
		});
		watcher.observe(node);
		return () => watcher.disconnect();
	}, [isFollowing, stick]);

	const onScroll = useCallback(() => {
		const node = scroller.current;
		if (node) onEndness(node.scrollHeight - node.clientHeight - node.scrollTop <= STICK_SLACK_PX);
	}, [onEndness]);

	return { scroller, onScroll };
}

function useBehind(isFollowing: boolean, total: number | null) {
	const [marked, setMarked] = useState<number | null>(null);

	useEffect(() => setMarked(isFollowing ? null : total), [isFollowing]);

	if (isFollowing || marked === null || total === null) return 0;
	return Math.max(0, total - marked);
}

type RowsProps = { rows: Row<LogLine>[]; total: number | null; following: TailProps["following"]; Line: Drawn };

function TailRows({ rows, total, following, Line }: RowsProps) {
	const { isFollowing, setFollowing } = useFollowing(following);
	const oldestFirst = useMemo(() => [...rows].reverse(), [rows]);
	const newest = oldestFirst[oldestFirst.length - 1];
	const { scroller, onScroll } = useStuckToEnd(isFollowing, `${oldestFirst.length}|${newest?.ref ?? ""}`, setFollowing);
	const behind = useBehind(isFollowing, total);

	return (
		<div className="wg-tail">
			<style>{CSS}</style>
			<div
				className="wg-tail-scroll"
				ref={scroller}
				onScroll={onScroll}
				role="log"
				aria-label={LIVE_LOG}
				aria-live="polite"
				aria-relevant="additions"
			>
				<SlotList
					slot={Line}
					rows={oldestFirst}
					keyOf={(row: Row<LogLine>) => row.ref}
					give={(row: Row<LogLine>) => ({ entry: row })}
				/>
			</div>
			{isFollowing ? null : <BackToEnd behind={behind} onPress={() => setFollowing(true)} />}
		</div>
	);
}

function BackToEnd({ behind, onPress }: { behind: number; onPress: () => void }) {
	return (
		<div className="wg-tail-back">
			<Button variant="accent" size="s" onClick={onPress}>
				<Icon name="arrow-down" size={16} />
				{BACK_TO_END}
				{behind > 0 ? <Count>{behind}</Count> : null}
			</Button>
		</div>
	);
}

function TailSaid({ text }: { text: string }) {
	return (
		<div className="wg-tail">
			<style>{CSS}</style>
			<p className="wg-tail-said">{text}</p>
		</div>
	);
}

function TailPatience({ stage, seconds }: { stage: Stage; seconds: number }) {
	if (stage === "quiet") return <div className="wg-tail" />;
	return (
		<div className="wg-tail">
			<style>{CSS}</style>
			<p className="wg-tail-waiting">
				{stage === "slow" ? (
					<span className="wg-tail-track">
						<i className="wg-tail-sweep" />
					</span>
				) : (
					<i className="wg-tail-turn" />
				)}
				{stage === "slow" ? STILL_READING.replace("{seconds}", String(seconds)) : READING}
			</p>
		</div>
	);
}
