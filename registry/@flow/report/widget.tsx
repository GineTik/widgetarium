import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { createWidget, defineManifest, defineProp, useData, valueGateway } from "widgetarium";
import { Button, Icon, SlotList } from "widgetarium/kit";
import type { Row, Slot, ValueGateway, ViewHost, WidgetProps } from "widgetarium";

const CSS = `
.flow-report {
	display: grid;
	grid-template-columns:
		[wide-start measure-start] minmax(0, var(--flow-report-measure, 68ch))
		[measure-end] minmax(0, 1fr) [wide-end];
	align-content: start;
	row-gap: var(--wg-gap-items);
	flex: 1 1 auto;
	min-width: 0;
	min-height: 0;
	overflow: auto;
}

.flow-report > * {
	grid-column: measure;
	min-width: 0;
}

.flow-report > .flow-report-figures {
	grid-column: wide;
}

.flow-report-prose.markdown-rendered > :first-child {
	margin-top: 0;
}

.flow-report-prose.markdown-rendered > :last-child {
	margin-bottom: 0;
}

.flow-report-plain {
	margin: 0;
	white-space: pre-wrap;
	font: inherit;
}

.flow-report-said {
	margin: 0;
	color: var(--wg-kit-text-muted);
}

.flow-report-part {
	display: flex;
	flex-direction: column;
	gap: var(--wg-gap-parts);
	min-width: 0;
}

.flow-report-part-name {
	margin: 0;
}

.flow-report-steps,
.flow-report-fixes {
	display: flex;
	flex-direction: column;
	gap: var(--wg-gap-items);
	margin: 0;
	padding: 0;
	list-style: none;
	min-width: 0;
}

.flow-report-step {
	display: grid;
	grid-template-columns: auto minmax(0, 1fr);
	align-items: start;
	column-gap: var(--wg-gap-parts);
	row-gap: var(--wg-gap-parts);
	min-width: 0;
}

.flow-report-step .wg-kit-icon-glyph {
	color: var(--text-faint);
}

.flow-report-step[data-done] .wg-kit-icon-glyph {
	color: var(--wg-kit-success);
}

.flow-report-step-what {
	min-width: 0;
	overflow-wrap: anywhere;
}

.flow-report-step-expected {
	grid-column: 2;
	min-width: 0;
	color: var(--wg-kit-text-muted);
	overflow-wrap: anywhere;
}

.flow-report-fix {
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	gap: var(--wg-gap-parts);
	min-width: 0;
}

.flow-report-fix-what {
	min-width: 0;
	overflow-wrap: anywhere;
}

.flow-report-fix-where {
	color: var(--wg-kit-text-muted);
	overflow-wrap: anywhere;
}

.flow-report-pager {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--wg-gap-parts);
	min-width: 0;
}

.flow-report-pager-said {
	color: var(--wg-kit-text-muted);
}

@container widget (width < 360px) {
	.flow-report-pager-said {
		flex-basis: 100%;
		order: -1;
	}
}
`;

type Prose = string | { content?: string | null; body?: string | null; path?: string | null } | null;

type Figure = {
	caption?: string | null;
	image?: string | null;
	alt?: string | null;
	drawing?: string | null;
};

type TestStep = { step?: string | null; expect?: string | null; done?: boolean | null };

type Fix = { title?: string | null; where?: string | null };

type ReportProps = WidgetProps<typeof manifest>;
type Figures = ReportProps["figures"];
type FigureSlot = Slot<{ source: ValueGateway<Figure> }>;
type Drawn = NonNullable<FigureSlot>;

type Read = { isLoading: boolean; failure: string | null; total: number | null };

const MEASURE_CH = 68;
const STEPS_PER_PAGE = 8;
const FIGURES_AT_MOST = 24;
const FIXES_AT_MOST = 50;

const NOTHING_YET = "No report has been written yet.";
const NO_SLOT = "This report has no widget to draw its figures with.";
const UNNAMED_STEP = "An unnamed step.";
const UNNAMED_FIX = "An unnamed fix.";
const MORE_FIXES = "{count} more are not shown here.";
const PAGE_SAID = "Steps {from} to {to} of {of}.";

const trimmed = (held: unknown) => (typeof held === "string" ? held.trim() : "");

function proseOf(source: Prose) {
	if (typeof source === "string") return source.trim();
	return trimmed(source?.content) || trimmed(source?.body);
}

function pathOf(source: Prose) {
	if (typeof source !== "object") return null;
	return source?.path ?? null;
}

const countOf = (read: Read, drawn: number) => read.total ?? drawn;

function usePositive(gateway: ReportProps["measure"], fallback: number) {
	const asked = Math.round(Number(useData(gateway.get).data));
	return asked > 0 ? asked : fallback;
}

function useFigureSource(figures: Figures, row: Row<Figure>) {
	return useMemo(
		() =>
			valueGateway<Figure>({
				id: `${figures.id}#${row.ref}`,
				handlers: {
					get: async () => {
						if (!figures.get.can().can) return row;
						return (await figures.get(row.ref)) ?? row;
					},
				},
			}),
		[figures, row.ref],
	);
}

function RenderedMarkdown({ host, markdown, path }: { host: ViewHost; markdown: string; path: string | null }) {
	const body = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		if (!body.current || !host.can.renderMarkdown) return undefined;
		return host.ui.renderMarkdown(body.current, markdown, path ?? undefined);
	}, [host, markdown, path]);

	if (!host.can.renderMarkdown) return <pre className="flow-report-plain">{markdown}</pre>;
	return <div ref={body} className="flow-report-prose markdown-rendered" data-part="prose" />;
}

function Prose({ host, source }: { host: ViewHost; source: Prose }) {
	const markdown = proseOf(source);
	if (!markdown) return null;
	return <RenderedMarkdown host={host} markdown={markdown} path={pathOf(source)} />;
}

function FigureItem({ figures, row, Drawn: Draw }: { figures: Figures; row: Row<Figure>; Drawn: Drawn }) {
	return <Draw source={useFigureSource(figures, row)} />;
}

function Figures({ figures, rows, slot }: { figures: Figures; rows: Row<Figure>[]; slot: FigureSlot }) {
	if (rows.length === 0) return null;
	if (!slot) return <p className="flow-report-said">{NO_SLOT}</p>;
	return (
		<SlotList slot={slot} className="flow-report-figures">
			{rows.map((row) => (
				<FigureItem key={row.ref} figures={figures} row={row} Drawn={slot} />
			))}
		</SlotList>
	);
}

function TestStepRow({ row }: { row: Row<TestStep> }) {
	const expected = trimmed(row.expect);
	return (
		<li className="flow-report-step" data-done={row.done === true ? "" : undefined}>
			<Icon name={row.done === true ? "check" : "circle"} />
			<span className="flow-report-step-what">{trimmed(row.step) || UNNAMED_STEP}</span>
			{expected ? <span className="flow-report-step-expected">{expected}</span> : null}
		</li>
	);
}

type PagerProps = { at: number; last: number; counted: number; perPage: number; onPage: (at: number) => void };

function Pager({ at, last, counted, perPage, onPage }: PagerProps) {
	const said = PAGE_SAID.replace("{from}", String(at * perPage + 1))
		.replace("{to}", String(Math.min(counted, (at + 1) * perPage)))
		.replace("{of}", String(counted));
	return (
		<div className="flow-report-pager">
			<Button variant="ghost" size="s" disabled={at === 0} onClick={() => onPage(at - 1)}>
				<Icon name="chevron-left" />
				Back
			</Button>
			<span className="flow-report-pager-said">{said}</span>
			<Button variant="ghost" size="s" disabled={at >= last} onClick={() => onPage(at + 1)}>
				Next
				<Icon name="chevron-right" />
			</Button>
		</div>
	);
}

type PlanProps = { rows: Row<TestStep>[]; counted: number; at: number; perPage: number; onPage: (at: number) => void };

function TestPlan({ rows, counted, at, perPage, onPage }: PlanProps) {
	if (rows.length === 0) return null;
	const last = Math.max(0, Math.ceil(counted / perPage) - 1);
	return (
		<section className="flow-report-part">
			<h3 className="flow-report-part-name">Test plan</h3>
			<ol className="flow-report-steps">
				{rows.map((row) => (
					<TestStepRow key={row.ref} row={row} />
				))}
			</ol>
			{last > 0 ? <Pager at={at} last={last} counted={counted} perPage={perPage} onPage={onPage} /> : null}
		</section>
	);
}

function Fixes({ rows, counted }: { rows: Row<Fix>[]; counted: number }) {
	if (rows.length === 0) return null;
	const left = counted - rows.length;
	return (
		<section className="flow-report-part">
			<h3 className="flow-report-part-name">What was fixed</h3>
			<ul className="flow-report-fixes">
				{rows.map((row) => (
					<li key={row.ref} className="flow-report-fix">
						<span className="flow-report-fix-what">{trimmed(row.title) || UNNAMED_FIX}</span>
						{trimmed(row.where) ? <code className="flow-report-fix-where">{trimmed(row.where)}</code> : null}
					</li>
				))}
			</ul>
			{left > 0 ? <p className="flow-report-said">{MORE_FIXES.replace("{count}", String(left))}</p> : null}
		</section>
	);
}

function ReportSaid({ text }: { text: string }) {
	return (
		<>
			<style>{CSS}</style>
			<p className="flow-report-said">{text}</p>
		</>
	);
}

function saidInstead(reads: Read[], isEmpty: boolean) {
	const failed = reads.find((read) => read.failure);
	if (failed) return failed.failure;
	if (reads.some((read) => read.isLoading)) return null;
	return isEmpty ? NOTHING_YET : null;
}

export const manifest = defineManifest({
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
	role: "detail",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 240, stackBelowPx: 420 },
	slots: {
		figure: {
			of: "widget",
			default: "@flow/report-figure",
			surface: "none",
			gives: { source: ["caption", "image", "alt", "drawing"] },
		},
	},
	preview: {
		size: { w: 6, h: 6 },
		props: {
			body: {
				value:
					"The board now reads a drop as a path, so a tile carried across the grain wraps the node it landed on.\n\nThe measure held: prose stays at reading width while a figure takes the whole column.",
			},
			figures: {
				rows: [
					{
						caption: "A tile carried across the grain wraps the leaf under the pointer.",
						drawing: "```\n[ A ]   [ B ]\n  └── dropped across ──┐\n[ A ]   [ B over C ]\n```",
					},
				],
			},
			testPlan: {
				rows: [
					{ step: "Carry a tile onto a leaf from the side.", expect: "A new row box holds both.", done: true },
					{ step: "Carry the last tile out of a box.", expect: "The box is pruned.", done: true },
					{ step: "Narrow the tile under the reading width.", expect: "The figure is the column wide.", done: false },
				],
			},
			fixes: {
				rows: [
					{ title: "A drop across the grain wrapped the parent, not the leaf.", where: "src/tree.js" },
					{ title: "An empty declared box was pruned with the rest.", where: "src/board-note.js" },
				],
			},
		},
	},
	props: {
		body: defineProp<Prose>()({
			label: "Report",
			hint: "The prose of the report, typed here or bound to a note. Headings, lists and links work as they do in a note.",
			default: "",
		}),
		figures: defineProp<Figure[]>()({
			label: "Figures",
			hint: "One record per figure, each drawn by the widget in the figure slot.",
			default: [],
			describes: {
				caption: { label: "Caption", type: "text", aka: ["title", "label", "legend"] },
				image: { label: "Image", type: "text", aka: ["picture", "screenshot", "file", "shot"] },
				alt: { label: "Alt text", type: "text", aka: ["alt-text", "description"] },
				drawing: { label: "Drawing", type: "text", aka: ["diagram", "chart", "sketch"] },
			},
		}),
		testPlan: defineProp<TestStep[]>()({
			label: "Test plan",
			hint: "One record per step: what to press, and what should happen when it is pressed.",
			default: [],
			describes: {
				step: { label: "Step", type: "text", aka: ["name", "title", "case", "action"] },
				expect: { label: "What should happen", type: "text", aka: ["expected", "result", "outcome"] },
				done: { label: "Checked", type: "boolean", aka: ["complete", "passed", "verified"] },
			},
		}),
		fixes: defineProp<Fix[]>()({
			label: "What was fixed",
			hint: "One record per fix, with the file it was made in.",
			default: [],
			describes: {
				title: { label: "Fix", type: "text", aka: ["name", "summary", "what"] },
				where: { label: "Where", type: "text", aka: ["file", "path", "location"] },
			},
		}),
		measure: defineProp<number>()({
			label: "Reading width, in characters",
			hint: "How wide the prose is allowed to run. A figure ignores it and takes the whole tile.",
			default: MEASURE_CH,
		}),
		stepsPerPage: defineProp<number>()({
			label: "Test steps per page",
			hint: "How many steps of the test plan are drawn at once.",
			default: STEPS_PER_PAGE,
		}),
	},
});

export default createWidget(manifest, ({ body, figures, testPlan, fixes, measure, stepsPerPage, slots, host }) => {
	const measureCh = usePositive(measure, MEASURE_CH);
	const perPage = usePositive(stepsPerPage, STEPS_PER_PAGE);
	const [at, setAt] = useState(0);

	const prose = useData(body.get);
	const figureRows = useData(figures.list, { limit: FIGURES_AT_MOST });
	const steps = useData(testPlan.list, { offset: at * perPage, limit: perPage });
	const fixRows = useData(fixes.list, { limit: FIXES_AT_MOST });

	const figuresCounted = countOf(figureRows, figureRows.data.length);
	const stepsCounted = countOf(steps, steps.data.length);
	const fixesCounted = countOf(fixRows, fixRows.data.length);
	const isEmpty = !proseOf(prose.data) && figuresCounted === 0 && stepsCounted === 0 && fixesCounted === 0;

	const said = saidInstead([prose, figureRows, steps, fixRows], isEmpty);
	if (said) return <ReportSaid text={said} />;

	return (
		<div className="flow-report" style={{ "--flow-report-measure": `${measureCh}ch` } as Record<string, string>}>
			<style>{CSS}</style>
			<Prose host={host} source={prose.data} />
			<Figures figures={figures} rows={figureRows.data as Row<Figure>[]} slot={slots?.figure as FigureSlot} />
			<TestPlan rows={steps.data as Row<TestStep>[]} counted={stepsCounted} at={at} perPage={perPage} onPage={setAt} />
			<Fixes rows={fixRows.data as Row<Fix>[]} counted={fixesCounted} />
		</div>
	);
});
