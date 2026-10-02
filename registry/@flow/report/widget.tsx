import { useState } from "react";
import { IHost, IQuery, ISlot, createWidget, defineLayout, defineMetadata, defineProps, useData, z } from "widgetarium";
import type { Row } from "widgetarium";
import { Figures } from "./figures";
import { Fixes } from "./fixes";
import { Prose } from "./prose";
import { proseOf } from "./prose-of";
import { ReportSaid } from "./report-said";
import { CSS } from "./style";
import { TestPlan } from "./test-plan";
import type { Figure, Fix, TestStep } from "./types";

export const FigureSchema = z.object({
	caption: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["title", "label", "legend"] }),
	image: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["picture", "screenshot", "file", "shot"] }),
	alt: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["alt-text", "description"] }),
	drawing: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["diagram", "chart", "sketch"] }),
});

export const TestStepSchema = z.object({
	step: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["name", "title", "case", "action"] }),
	expect: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["expected", "result", "outcome"] }),
	done: z
		.boolean()
		.nullable()
		.optional()
		.meta({ aka: ["complete", "passed", "verified"] }),
});

export const FixSchema = z.object({
	title: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["name", "summary", "what"] }),
	where: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["file", "path", "location"] }),
});

type Read = { isLoading: boolean; failure: string | null; total: number | null };

const MEASURE_CH = 68;
const STEPS_PER_PAGE = 8;
const FIGURES_AT_MOST = 24;
const FIXES_AT_MOST = 50;

const NOTHING_YET = "No report has been written yet.";

const countOf = (read: Read, drawn: number) => read.total ?? drawn;

function positiveOr(held: number, fallback: number) {
	const asked = Math.round(Number(held));
	return asked > 0 ? asked : fallback;
}

function saidInstead(reads: Read[], isEmpty: boolean) {
	const failed = reads.find((read) => read.failure);
	if (failed) return failed.failure;
	if (reads.some((read) => read.isLoading)) return null;
	return isEmpty ? NOTHING_YET : null;
}

export const ProseSourceSchema = z.union([
	z.string(),
	z.object({ content: z.string().nullish(), body: z.string().nullish(), path: z.string().nullish() }),
]);

export const props = defineProps({
	getBody: IQuery.of(ProseSourceSchema.default("")),
	getFigures: IQuery.of(z.array(FigureSchema)),
	getTestPlan: IQuery.of(z.array(TestStepSchema)),
	getFixes: IQuery.of(z.array(FixSchema)),
	getMeasure: IQuery.of(z.number().default(MEASURE_CH)),
	getStepsPerPage: IQuery.of(z.number().default(STEPS_PER_PAGE)),
	figure: ISlot.of<{ getSource: Figure }>({
		default: "@flow/report-figure",
		surface: "none",
		gives: { getSource: ["caption", "image", "alt", "drawing"] },
	}),
	host: IHost,
});

const ReportWidget = createWidget({
	inject: props,
	draw: ({
		getBody: body,
		getFigures,
		getTestPlan,
		getFixes,
		getMeasure: measure,
		getStepsPerPage: stepsPerPage,
		figure,
		host,
	}) => {
		const measureCh = positiveOr(measure, MEASURE_CH);
		const perPage = positiveOr(stepsPerPage, STEPS_PER_PAGE);
		const [at, setAt] = useState(0);

		const figureRows = useData(getFigures, { limit: FIGURES_AT_MOST });
		const steps = useData(getTestPlan, { offset: at * perPage, limit: perPage });
		const fixRows = useData(getFixes, { limit: FIXES_AT_MOST });

		const figuresCounted = countOf(figureRows, figureRows.data.length);
		const stepsCounted = countOf(steps, steps.data.length);
		const fixesCounted = countOf(fixRows, fixRows.data.length);
		const isEmpty = !proseOf(body) && figuresCounted === 0 && stepsCounted === 0 && fixesCounted === 0;

		const said = saidInstead([figureRows, steps, fixRows], isEmpty);
		if (said) return <ReportSaid text={said} />;

		return (
			<div className="flow-report" style={{ "--flow-report-measure": `${measureCh}ch` } as Record<string, string>}>
				<style>{CSS}</style>
				<Prose host={host} source={body} />
				<Figures rows={figureRows.data as Row<Figure>[]} slot={figure} />
				<TestPlan
					rows={steps.data as Row<TestStep>[]}
					counted={stepsCounted}
					at={at}
					perPage={perPage}
					onPage={setAt}
				/>
				<Fixes rows={fixRows.data as Row<Fix>[]} counted={fixesCounted} />
			</div>
		);
	},
});

export const metadata = defineMetadata(ReportWidget, {
	title: "Report",
	description:
		"What an agent did once it finished: the prose at reading width, the figures beside it, the test plan and the list of what was fixed.",
	keywords: [
		"report",
		"summary",
		"handoff",
		"write-up",
		"findings",
		"result",
		"test plan",
		"fixes",
		"changelog",
		"review",
		"agent",
		"figures",
	],
	preview: {
		size: { w: 6, h: 6 },
		props: {
			getBody: {
				value:
					"The board now reads a drop as a path, so a tile carried across the grain wraps the node it landed on.\n\nThe measure held: prose stays at reading width while a figure takes the whole column.",
			},
			getFigures: {
				rows: [
					{
						caption: "A tile carried across the grain wraps the leaf under the pointer.",
						drawing: "```\n[ A ]   [ B ]\n  └── dropped across ──┐\n[ A ]   [ B over C ]\n```",
					},
				],
			},
			getTestPlan: {
				rows: [
					{ step: "Carry a tile onto a leaf from the side.", expect: "A new row box holds both.", done: true },
					{ step: "Carry the last tile out of a box.", expect: "The box is pruned.", done: true },
					{ step: "Narrow the tile under the reading width.", expect: "The figure is the column wide.", done: false },
				],
			},
			getFixes: {
				rows: [
					{ title: "A drop across the grain wrapped the parent, not the leaf.", where: "src/tree.js" },
					{ title: "An empty declared box was pruned with the rest.", where: "src/board-note.js" },
				],
			},
		},
	},
	props: {
		getBody: {
			label: "Report",
			aka: ["body"],
			hint: "The prose of the report, typed here or bound to a note. Headings, lists and links work as they do in a note.",
		},
		getFigures: {
			label: "Figures",
			aka: ["figures"],
			hint: "One record per figure, each drawn by the widget in the figure slot.",
			describes: {
				caption: { label: "Caption", type: "text" },
				image: { label: "Image", type: "text" },
				alt: { label: "Alt text", type: "text" },
				drawing: { label: "Drawing", type: "text" },
			},
		},
		getTestPlan: {
			label: "Test plan",
			aka: ["testPlan"],
			hint: "One record per step: what to press, and what should happen when it is pressed.",
			describes: {
				step: { label: "Step", type: "text" },
				expect: { label: "What should happen", type: "text" },
				done: { label: "Checked", type: "boolean" },
			},
		},
		getFixes: {
			label: "What was fixed",
			aka: ["fixes"],
			hint: "One record per fix, with the file it was made in.",
			describes: {
				title: { label: "Fix", type: "text" },
				where: { label: "Where", type: "text" },
			},
		},
		getMeasure: {
			label: "Reading width, in characters",
			aka: ["measure"],
			hint: "How wide the prose is allowed to run. A figure ignores it and takes the whole tile.",
		},
		getStepsPerPage: {
			label: "Test steps per page",
			aka: ["stepsPerPage"],
			hint: "How many steps of the test plan are drawn at once.",
		},
	},
});

export const layout = defineLayout({
	role: "detail",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 240, stackBelowPx: 420 },
});

export default ReportWidget;
