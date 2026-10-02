import { useEffect, useState } from "react";
import {
	ICommand,
	IQuery,
	ISlot,
	RecordRefSchema,
	VaultRecordSchema,
	createWidget,
	defineLayout,
	defineMetadata,
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

const ListWidget = createWidget({
	inject: {
		getRows: IQuery.expects(z.array(VaultRecordSchema)),
		updateRow: ICommand.sends(VaultRecordSchema.partial().extend({ ref: RecordRefSchema })),
		getHandedAs: IQuery.expects(z.string().default("getTask")),
		getSelection: IQuery.expects(z.unknown()),
		select: ICommand.sends(z.unknown()),
		getFilter: IQuery.expects(z.string().default("")),
		setFilter: ICommand.sends(z.string()),
		getFilterField: IQuery.expects(z.string().default("title")),
		getPageSize: IQuery.expects(z.number().default(PAGE_SIZE)),
		getHeading: IQuery.expects(z.string().default("")),
		row: ISlot.of<Handed>({ default: "@default/task-card", surface: "group" }),
	},
	draw: ({
		getRows,
		updateRow,
		getHandedAs: handedAs,
		getSelection: selection,
		select,
		getFilter: filter,
		setFilter,
		getFilterField: filterField,
		getPageSize: pageSize,
		getHeading: heading,
		row,
	}) => {
		const step = askedSize(pageSize);
		const [shown, setShown] = useState(step);
		useEffect(() => setShown(step), [step]);

		const asked = saidOf(filter);
		const field = saidOf(filterField);
		const page = useData(getRows, { where: whereFieldHolds(field, asked), limit: shown });
		const everyRow = useData(getRows, { limit: 1 });
		const picked = pickedValue(selection);
		const givenAs = saidOf(handedAs) || "row";
		const title = saidOf(heading);

		const said = saidInstead({ slot: row, page, everyRow, isFiltered: asked !== "" });
		const onClear = said?.canClear && setFilter.can().can ? () => void setFilter("") : null;
		const onPick = select.can().can ? (ref: string) => void select(ref) : null;

		return (
			<div className="wg-list">
				<style>{CSS}</style>
				{title === "" ? null : <h3 className="wg-list-heading">{title}</h3>}
				{said ? (
					<Instead said={said} onClear={onClear} />
				) : (
					<Drawing
						updateRow={updateRow}
						Drawn={row as Drawn}
						page={page}
						givenAs={givenAs}
						picked={picked}
						onPick={onPick}
					/>
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
			getRows: {
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
			getHandedAs: { value: "getTask" },
		},
	},
	props: {
		getRows: {
			aka: ["rows"],
			hint: "The records this list draws, one apiece. Whatever a row holds is handed to the widget in the slot whole.",
		},
		updateRow: {
			label: "Change a row",
			source: { implementation: "@core/rows-update", fields: { target: "getRows" } },
		},
		getHandedAs: {
			aka: ["handedAs"],
			hint: "The name of the prop the row arrives under. @default/task-card takes getTask, @flow/commit-row takes getCommit. A row widget that writes takes the same name with update in place of get.",
		},
		getSelection: {
			label: "Selected row",
			hint: "Which row is picked. A detail tile reading the same collection follows it.",
			aka: ["selection"],
			source: { implementation: "@core/selection", fields: { rows: "getRows" } },
		},
		select: {
			label: "Pick a row",
			source: { implementation: "@core/value-set", fields: { target: "getSelection" } },
		},
		getFilter: {
			aka: ["filter"],
			hint: "Only rows whose filtered field holds these words are listed. Bind a search field and the two move together.",
			wants: "@default/search-input/value",
		},
		setFilter: {
			label: "Clear the filter",
			source: { implementation: "@core/value-set", fields: { target: "getFilter" } },
		},
		getFilterField: { label: "Filtered field", hint: "The field the filter is matched in.", aka: ["filterField"] },
		getPageSize: {
			label: "Rows per page",
			hint: "How many rows are read at first, and how many more each press of Show more reads.",
			aka: ["pageSize"],
		},
		getHeading: { hint: "A line above the rows. Left empty, none is drawn.", aka: ["heading"] },
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
