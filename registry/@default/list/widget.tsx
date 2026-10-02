import { useEffect, useState } from "react";
import {
	ICrudGateway,
	ISlot,
	IValueGateway,
	VaultRecordSchema,
	canDo,
	createWidget,
	defineLayout,
	defineMetadata,
	defineProps,
	pickedValue,
	useData,
	z,
} from "widgetarium";
import { Drawing } from "./drawing";
import { Foot } from "./foot";
import { Instead } from "./instead";
import { TOTAL } from "./total-placeholder";
import type { Drawn, Handed, Reading, RowSlot, Said } from "./types";

const PAGE_SIZE = 20;

const NO_SLOT = "This list has no widget to draw its rows with.";
const READING = "Reading…";
const NOTHING = "Nothing here yet.";
const NO_MATCHES = "No row matches the filter.";
const COUNTED_ALL = "{total} in all.";

const CSS = `
.wg-list {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	gap: var(--wg-gap-items);
	min-width: 0;
	min-height: 0;
}

.wg-list-heading {
	flex: none;
	margin: 0;
	font-size: var(--font-ui-medium, 15px);
	font-weight: var(--font-medium, 500);
}

.wg-list-body {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	gap: var(--wg-gap-items);
	min-width: 0;
	min-height: 0;
	overflow: auto;
}

.wg-list-pick {
	position: relative;
	min-width: 0;
	border-radius: var(--wg-kit-plate);
	cursor: pointer;
}

.wg-list-pick[data-picked]::before {
	content: "";
	position: absolute;
	z-index: 1;
	inset-block: 25%;
	inset-inline-start: 0;
	width: 3px;
	border-radius: var(--wg-kit-pill);
	background: var(--wg-kit-accent);
}

.wg-list-pick:focus-visible {
	outline: 2px solid var(--wg-kit-accent);
	outline-offset: 2px;
}

.wg-list-foot {
	display: flex;
	flex: none;
	align-items: center;
	gap: var(--wg-gap-parts);
	color: var(--text-faint);
	font-size: var(--font-ui-smaller, 12px);
}

.wg-list-said {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--wg-gap-parts);
	margin: 0;
	color: var(--wg-kit-text-muted);
}

.wg-list-said p {
	margin: 0;
}

.wg-list-said.is-failed {
	color: var(--text-error);
}

.wg-list-said.is-reading {
	color: var(--text-faint);
}
`;

export const props = defineProps({
	rows: ICrudGateway.of(VaultRecordSchema).pick("list", "update"),
	handedAs: IValueGateway.of(z.string().default("task")).pick("get"),
	selection: IValueGateway.of(z.unknown()).pick("get", "update"),
	filter: IValueGateway.of(z.string().default("")).pick("get", "update"),
	filterField: IValueGateway.of(z.string().default("title")).pick("get"),
	pageSize: IValueGateway.of(z.number().default(PAGE_SIZE)).pick("get"),
	heading: IValueGateway.of(z.string().default("")).pick("get"),
	row: ISlot.of<Handed>({ default: "@default/task-card", surface: "group" }),
});

const ListWidget = createWidget({
	inject: props,
	draw: ({ rows, handedAs, selection, filter, filterField, pageSize, heading, row }) => {
		const step = askedSize(pageSize);
		const [shown, setShown] = useState(step);
		useEffect(() => setShown(step), [step]);

		const asked = saidOf(filter.value);
		const field = saidOf(filterField);
		const page = useData(rows.list, { where: whereFieldHolds(field, asked), limit: shown });
		const everyRow = useData(rows.list, { limit: 1 });
		const picked = pickedValue(selection.value);
		const givenAs = saidOf(handedAs) || "row";
		const title = saidOf(heading);

		const said = saidInstead({ slot: row, page, everyRow, isFiltered: asked !== "" });
		const onClear = said?.canClear && canDo(filter.update) ? () => void filter.update("") : null;
		const onPick = canDo(selection.update) ? (ref: string) => void selection.update(ref) : null;

		return (
			<div className="wg-list">
				<style>{CSS}</style>
				{title === "" ? null : <h3 className="wg-list-heading">{title}</h3>}
				{said ? (
					<Instead said={said} onClear={onClear} />
				) : (
					<Drawing rows={rows} Drawn={row as Drawn} page={page} givenAs={givenAs} picked={picked} onPick={onPick} />
				)}
				{said ? null : (
					<Foot shown={page.data.length} total={page.total} step={step} onMore={() => setShown(shown + step)} />
				)}
			</div>
		);
	},
});

export const metadata = defineMetadata(ListWidget, {
	title: "List",
	description: "Every row of a collection drawn by the widget in its slot, a page at a time, with a press that picks.",
	keywords: [
		"list",
		"rows",
		"collection",
		"items",
		"table",
		"grid",
		"feed",
		"browse",
		"pick",
		"select",
		"filter",
		"paginate",
		"catalogue",
		"directory",
	],
	preview: {
		size: { w: 5, h: 4 },
		props: {
			rows: {
				rows: [
					{
						path: "preview/onboarding.md",
						title: "Design the onboarding flow",
						tags: ["design"],
						priority: "P1",
						progress: 60,
						due: "12 Aug",
					},
					{
						path: "preview/release-notes.md",
						title: "Record the release notes",
						tags: ["launch"],
						priority: "P3",
						progress: 80,
						due: "4 Sep",
					},
					{
						path: "preview/paint-gate.md",
						title: "Run the paint gate on every widget",
						tags: ["build"],
						priority: "P2",
						progress: 20,
						due: "20 Sep",
					},
				],
			},
			handedAs: { value: "task" },
		},
	},
	props: {
		rows: {
			hint: "The records this list draws, one apiece. Whatever a row holds is handed to the widget in the slot whole.",
		},
		handedAs: {
			hint: "The name of the prop the row arrives under. @default/task-card takes task, @flow/commit-row takes getCommit.",
		},
		selection: {
			label: "Selected row",
			hint: "Which row is picked. A detail tile reading the same collection follows it.",
			source: { implementation: "@core/selection", fields: { rows: "rows" } },
		},
		filter: {
			hint: "Only rows whose filtered field holds these words are listed. Bind a search field and the two move together.",
			wants: "@default/search-input/value",
		},
		filterField: { label: "Filtered field", hint: "The field the filter is matched in." },
		pageSize: {
			label: "Rows per page",
			hint: "How many rows are read at first, and how many more each press of Show more reads.",
		},
		heading: { hint: "A line above the rows. Left empty, none is drawn." },
	},
});

export const layout = defineLayout({
	role: "collection",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 160, stackBelowPx: 320 },
});

export default ListWidget;

function saidInstead({
	slot,
	page,
	everyRow,
	isFiltered,
}: {
	slot: RowSlot;
	page: Reading;
	everyRow: Reading;
	isFiltered: boolean;
}): Said | null {
	if (!slot) return { text: NO_SLOT, tone: "muted", count: null, canClear: false };
	if (page.failure !== null) return { text: page.failure, tone: "failed", count: null, canClear: false };
	if (page.isLoading && page.data.length === 0) return { text: READING, tone: "reading", count: null, canClear: false };
	if (page.data.length > 0) return null;
	if (!isFiltered) return { text: NOTHING, tone: "muted", count: null, canClear: false };
	return {
		text: NO_MATCHES,
		tone: "muted",
		count: COUNTED_ALL.replace(TOTAL, String(everyRow.total ?? 0)),
		canClear: true,
	};
}

function whereFieldHolds(field: string, asked: string) {
	if (field === "" || asked === "") return [];
	return [{ prop: field, op: "contains", value: asked }];
}

function askedSize(held: unknown): number {
	const asked = Math.round(Number(held));
	return Number.isFinite(asked) && asked > 0 ? asked : PAGE_SIZE;
}

function saidOf(held: unknown): string {
	return held === null || held === undefined ? "" : String(held).trim();
}
