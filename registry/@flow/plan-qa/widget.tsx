import { useState } from "react";
import { createWidget, defineManifest, defineProp, useData } from "widgetarium";
import type { Row, Slot } from "widgetarium";
import { Button, SlotList } from "widgetarium/kit";

const CSS = `
.wg-plan-qa {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: var(--wg-gap-items);
	min-width: 0;
}

.wg-plan-qa-more {
	align-self: flex-start;
}

.wg-plan-qa-said {
	margin: 0;
	font-size: var(--font-ui-small, 14px);
	color: var(--wg-kit-text-muted);
}
`;

type Question = {
	question?: string | undefined;
	options?: readonly string[] | string | undefined;
	answer?: string | undefined;
	reason?: string | undefined;
};

type QuestionSlot = Slot<{ asked: Question }>;
type Drawn = NonNullable<QuestionSlot>;

const PAGE_SIZE = 20;
const NOTHING = "No questions were asked before this plan — it was clear enough to start.";
const NO_SLOT = "This record has no widget to draw its questions with.";
const SHOW_MORE = "Show more";

export const manifest = defineManifest({
	title: "Plan questions",
	description:
		"The questions an agent asked before it started and the answers that were chosen, every rejected option still readable.",
	keywords: [
		"questions",
		"answers",
		"decisions",
		"plan",
		"agent",
		"record",
		"choices",
		"options",
		"rationale",
		"why",
		"review",
		"handoff",
	],
	role: "collection",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 160, stackBelowPx: 320 },
	slots: {
		question: {
			of: "widget",
			default: "@flow/qa-block",
			surface: "group",
			gives: { asked: ["question", "options", "answer", "reason"] },
		},
	},
	preview: {
		size: { w: 5, h: 5 },
		props: {
			questions: {
				rows: [
					{
						question: "Where does the loading threshold live?",
						options: ["one engine constant", "per widget", "per binding"],
						answer: "one engine constant",
						reason: "One number a person can find and change, instead of three settings nobody tunes.",
					},
					{
						question: "What happens to a tile whose widget the vault does not hold?",
						options: ["hide the tile", "draw a placeholder naming it", "refuse the whole board"],
						answer: "draw a placeholder naming it",
						reason:
							"A board that quietly loses a tile teaches nobody. The placeholder carries the id, so the install is one press away.",
					},
					{
						question: "How many rows does a list hand over when nothing asked for a number?",
						options: ["all of them", "ten"],
						answer: "a hundred",
						reason:
							"Enough to fill a screen twice, few enough that a vault of a thousand notes cannot take the frame with it.",
					},
				],
			},
		},
	},
	props: {
		questions: defineProp<Question[]>()({
			label: "Questions",
			hint: "One record per question asked, each carrying the options offered, the answer chosen and the reason for it.",
			default: [
				{
					question: "Where does the loading threshold live?",
					options: ["one engine constant", "per widget", "per binding"],
					answer: "one engine constant",
					reason: "One number a person can find and change, instead of three settings nobody tunes.",
				},
				{
					question: "How many rows does a list hand over when nothing asked for a number?",
					options: ["all of them", "ten"],
					answer: "a hundred",
					reason:
						"Enough to fill a screen twice, few enough that a vault of a thousand notes cannot take the frame with it.",
				},
			],
			describes: {
				question: {
					label: "Question",
					hint: "The question that was asked, in full.",
					type: "text",
					required: true,
					aka: ["asked", "prompt", "ask"],
				},
				options: {
					label: "Options",
					hint: "Every option that was offered, as a list or separated by commas.",
					type: "text",
					many: true,
					aka: ["choices", "alternatives", "offered"],
				},
				answer: {
					label: "Answer",
					hint: "The option that was chosen. An answer naming none of them is drawn beside them, not dropped.",
					type: "line",
					aka: ["chosen", "decision", "picked"],
				},
				reason: {
					label: "Reason",
					hint: "Why that answer won.",
					type: "text",
					aka: ["why", "rationale", "because"],
				},
			},
		}),
	},
});

export default createWidget(manifest, ({ questions, slots }) => {
	const [shown, setShown] = useState(PAGE_SIZE);
	const listed = useData(questions.list, { offset: 0, limit: shown });
	const said = saidInstead(slots?.question as QuestionSlot | undefined, listed);

	if (said)
		return (
			<div className="wg-plan-qa">
				<style>{CSS}</style>
				<p className="wg-plan-qa-said">{said}</p>
			</div>
		);

	return (
		<div className="wg-plan-qa">
			<style>{CSS}</style>
			<SlotList slot={slots?.question as Drawn} rows={listed.data as Row<Question>[]} keyOf={keyOf} give={give} />
			{(listed.total ?? 0) > listed.data.length ? (
				<Button size="s" variant="ghost" className="wg-plan-qa-more" onClick={() => setShown(shown + PAGE_SIZE)}>
					{SHOW_MORE}
				</Button>
			) : null}
		</div>
	);
});

function saidInstead(
	slot: QuestionSlot | undefined,
	listed: { data: unknown[]; failure: string | null; isLoading: boolean },
): string | null {
	if (!slot) return NO_SLOT;
	if (listed.failure) return listed.failure;
	return !listed.isLoading && listed.data.length === 0 ? NOTHING : null;
}

const keyOf = (row: Row<Question>) => row.ref;

const give = (row: Row<Question>) => ({ asked: row });
