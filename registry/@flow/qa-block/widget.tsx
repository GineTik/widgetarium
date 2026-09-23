import { useEffect, useRef, useState } from "react";
import { createWidget, defineManifest, defineProp, useValue } from "widgetarium";
import { Button, Icon } from "widgetarium/kit";

const CSS = `
.wg-qa-block {
	display: flex;
	flex-direction: column;
	gap: var(--wg-gap-parts);
	min-width: 0;
}

.wg-qa-block-said {
	margin: 0;
	font-size: var(--font-ui-small, 14px);
	color: var(--wg-kit-text-muted);
}

/* TRADE-OFF: max-height repeats the three lines for engines without -webkit-box — no ellipsis there */
.wg-qa-block-question {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 3;
	overflow: hidden;
	max-height: calc(var(--font-ui-medium, 15px) * var(--line-height-tight, 1.3) * 3);
	margin: 0;
	min-width: 0;
	font-size: var(--font-ui-medium, 15px);
	font-weight: var(--font-semibold, 600);
	line-height: var(--line-height-tight, 1.3);
	color: var(--wg-kit-text);
	overflow-wrap: anywhere;
}

.wg-qa-block-options {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-start;
	gap: var(--wg-gap-parts);
	min-width: 0;
}

.wg-qa-block-option {
	display: inline-flex;
	align-items: center;
	gap: var(--size-2-2, 4px);
	box-sizing: border-box;
	max-width: 100%;
	min-width: 0;
	padding: var(--size-2-2, 4px) var(--size-4-2, 8px);
	border-radius: var(--wg-kit-pill);
	background: var(--wg-kit-fill);
	font-size: var(--font-ui-smaller, 12px);
	line-height: var(--line-height-tight, 1.3);
	color: var(--text-faint);
}

.wg-qa-block-option-label {
	min-width: 0;
	white-space: normal;
	overflow-wrap: anywhere;
}

.wg-qa-block-option[data-chosen="no"] .wg-qa-block-option-label {
	text-decoration: line-through;
}

.wg-qa-block-option[data-chosen="yes"] {
	background: var(--wg-kit-accent-wash);
	font-weight: var(--font-semibold, 600);
	color: var(--wg-kit-text);
}

/* TRADE-OFF: an inset ring and not a border — a real border moves the chip 1px off the others' line */
.wg-qa-block-option[data-offered="no"] {
	box-shadow: inset 0 0 0 1px var(--wg-kit-card-edge);
}

.wg-qa-block-mark {
	flex: none;
	color: var(--wg-kit-accent);
}

.wg-qa-block-reason-box {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--size-2-2, 4px);
	min-width: 0;
}

.wg-qa-block-reason {
	margin: 0;
	min-width: 0;
	font-size: var(--font-ui-small, 14px);
	line-height: var(--line-height-normal, 1.5);
	color: var(--wg-kit-text-muted);
	overflow-wrap: anywhere;
}

.wg-qa-block-reason[data-clamped="yes"] {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 4;
	overflow: hidden;
	max-height: calc(var(--font-ui-small, 14px) * var(--line-height-normal, 1.5) * 4);
}

@container widget (width < 320px) {
	.wg-qa-block .wg-qa-block-options {
		flex-direction: column;
	}

	.wg-qa-block .wg-qa-block-option {
		width: 100%;
	}
}
`;

type Question = {
	question?: string | undefined;
	options?: readonly string[] | string | undefined;
	answer?: string | undefined;
	reason?: string | undefined;
};

type Chip = { label: string; isChosen: boolean; wasOffered: boolean };

const MARK_PX = 14;
const NOTHING = "Nothing was recorded for this question.";
const SHOW_REST = "Show the rest";
const SHOW_LESS = "Show less";

export const manifest = defineManifest({
	title: "Question and answer",
	description:
		"One question an agent asked before it started: every option it offered, the answer that won, and the reason underneath.",
	keywords: [
		"question",
		"answer",
		"decision",
		"choice",
		"option",
		"reason",
		"rationale",
		"why",
		"plan",
		"record",
		"agent",
		"review",
	],
	role: "detail",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 120, stackBelowPx: 320 },
	preview: {
		size: { w: 4, h: 2 },
		props: {
			asked: {
				value: {
					question: "Where does the loading threshold live?",
					options: ["one engine constant", "per widget", "per binding"],
					answer: "one engine constant",
					reason:
						"One number a person can find and change. A threshold per widget is three settings nobody tunes, and a threshold per binding is a number nobody can explain a week later.",
				},
			},
		},
	},
	props: {
		asked: defineProp<Question>()({
			label: "Question",
			hint: "The question, the options it offered, the answer that was chosen and the reason for it. Standing in a record it is handed down; standing alone it is the one typed here.",
			default: {
				question: "Where does the loading threshold live?",
				options: ["one engine constant", "per widget", "per binding"],
				answer: "one engine constant",
				reason: "One number a person can find and change, instead of three settings nobody tunes.",
			},
		}),
	},
});

export default createWidget(manifest, ({ asked }) => {
	const held: Question = useValue(asked) ?? {};
	const chips = chipsOf(held);
	const question = textOf(held.question);
	const reason = textOf(held.reason);

	if (!question && !reason && chips.length === 0)
		return (
			<div className="wg-qa-block">
				<style>{CSS}</style>
				<p className="wg-qa-block-said">{NOTHING}</p>
			</div>
		);

	return (
		<div className="wg-qa-block">
			<style>{CSS}</style>
			{question ? <p className="wg-qa-block-question">{question}</p> : null}
			<Options chips={chips} />
			<Reason text={reason} />
		</div>
	);
});

function Options({ chips }: { chips: Chip[] }) {
	if (chips.length === 0) return null;
	return (
		<div className="wg-qa-block-options">
			{chips.map((chip, at) => (
				<span
					key={`${chip.label}-${at}`}
					className="wg-qa-block-option"
					data-chosen={chip.isChosen ? "yes" : "no"}
					data-offered={chip.wasOffered ? "yes" : "no"}
				>
					{chip.isChosen ? <Icon name="tick" size={MARK_PX} className="wg-qa-block-mark" /> : null}
					<span className="wg-qa-block-option-label">{chip.label}</span>
				</span>
			))}
		</div>
	);
}

function Reason({ text }: { text: string }) {
	const { body, isOpen, isOverflowing, toggle } = useClamped(text);
	if (!text) return null;
	return (
		<div className="wg-qa-block-reason-box">
			<p ref={body} className="wg-qa-block-reason" data-clamped={isOpen ? "no" : "yes"}>
				{text}
			</p>
			{isOverflowing ? (
				<Button size="s" variant="ghost" onClick={toggle}>
					{isOpen ? SHOW_LESS : SHOW_REST}
				</Button>
			) : null}
		</div>
	);
}

function useClamped(text: string) {
	const body = useRef<HTMLParagraphElement>(null);
	const [isOpen, setOpen] = useState(false);
	const [isOverflowing, setOverflowing] = useState(false);

	useEffect(() => {
		const node = body.current;
		if (!node || isOpen) return undefined;
		const measure = () => setOverflowing(node.scrollHeight > node.clientHeight + 1);
		measure();
		const watcher = new ResizeObserver(measure);
		watcher.observe(node);
		return () => watcher.disconnect();
	}, [text, isOpen]);

	return { body, isOpen, isOverflowing, toggle: () => setOpen(!isOpen) };
}

// TRADE-OFF: an answer naming no offered option is appended rather than dropped — it is what was chosen
function chipsOf(held: Question): Chip[] {
	const answer = textOf(held.answer);
	const offered = listOf(held.options).map((label) => ({
		label,
		isChosen: matches(label, answer),
		wasOffered: true,
	}));
	if (answer === "" || offered.some((chip) => chip.isChosen)) return offered;
	return [...offered, { label: answer, isChosen: true, wasOffered: false }];
}

function matches(label: string, answer: string): boolean {
	return answer !== "" && label.toLowerCase() === answer.toLowerCase();
}

function listOf(held: unknown): string[] {
	const rows = Array.isArray(held) ? held : String(held ?? "").split(",");
	return rows.map((entry) => textOf(entry)).filter(Boolean);
}

function textOf(held: unknown): string {
	return String(held ?? "").trim();
}
