import { IValueGateway, createWidget, defineLayout, defineMetadata, z } from "widgetarium";
import { Options } from "./options";
import { Reason } from "./reason";
import type { Chip } from "./types";

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

const QuestionSchema = z.object({
	question: z.string().optional(),
	options: z.union([z.array(z.string()), z.string()]).optional(),
	answer: z.string().optional(),
	reason: z.string().optional(),
});

type Question = z.infer<typeof QuestionSchema>;

const NOTHING = "Nothing was recorded for this question.";

const QaBlock = createWidget({
	inject: {
		asked: IValueGateway.of(
			QuestionSchema.default({
				question: "Where does the loading threshold live?",
				options: ["one engine constant", "per widget", "per binding"],
				answer: "one engine constant",
				reason: "One number a person can find and change, instead of three settings nobody tunes.",
			}),
		).pick("get"),
	},
	draw: ({ asked }) => {
		const chips = chipsOf(asked);
		const question = textOf(asked.question);
		const reason = textOf(asked.reason);

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
	},
});

export const metadata = defineMetadata(QaBlock, {
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
		asked: {
			label: "Question",
			hint: "The question, the options it offered, the answer that was chosen and the reason for it. Standing in a record it is handed down; standing alone it is the one typed here.",
		},
	},
});

export const layout = defineLayout({
	role: "detail",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 120, stackBelowPx: 320 },
});

export default QaBlock;

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
