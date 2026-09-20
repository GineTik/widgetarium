import { useEffect, useMemo, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { canDo, createWidget, defineManifest, defineProp, pickedValue, useData, valueGateway } from "widgetarium";
import type { Row, Slot, ValueGateway, VaultRecord, WidgetProps } from "widgetarium";
import { Button, SlotList } from "widgetarium/kit";

const PAGE_SIZE = 20;
const PRESS_KEYS = ["Enter", " "];

const NO_SLOT = "This list has no widget to draw its rows with.";
const READING = "Reading…";
const NOTHING = "Nothing here yet.";
const NO_MATCHES = "No row matches the filter.";
const COUNTED_ALL = "{total} in all.";
const CLEAR_THE_FILTER = "Clear the filter";
const SHOW_MORE = "Show {count} more";
const SHOWN_OF_ALL = "{shown} of {total}";
const COUNTED = "{total} rows";
const COUNT = "{count}";
const SHOWN = "{shown}";
const TOTAL = "{total}";

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
	color: var(--text-muted);
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

type ListProps = WidgetProps<typeof manifest>;
type Rows = ListProps["rows"];
type Entry = Row<VaultRecord>;
type Handed = Record<string, ValueGateway<VaultRecord>>;
type RowSlot = Slot<Handed>;
type Drawn = NonNullable<RowSlot>;
type Reading = { failure: string | null; isLoading: boolean; total: number | null; data: readonly unknown[] };
type Said = { text: string; tone: "muted" | "failed" | "reading"; count: string | null; canClear: boolean };

export const manifest = defineManifest({
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
	role: "collection",
	size: { collapseBelowPx: 160, stackBelowPx: 320 },
	slots: {
		row: {
			of: "widget",
			default: "@default/task-card",
			surface: "group",
		},
	},
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
		rows: defineProp<VaultRecord[]>()({
			label: "Rows",
			hint: "The records this list draws, one apiece. Whatever a row holds is handed to the widget in the slot whole.",
			default: [],
			writes: ["update"],
		}),
		handedAs: defineProp<string>()({
			label: "Handed as",
			hint: "The name of the prop the row arrives under. @default/task-card takes task, @flow/commit-row takes commit.",
			default: "task",
		}),
		selection: defineProp<string>()({
			label: "Selected row",
			hint: "Which row is picked. A detail tile reading the same collection follows it.",
			of: "rows",
			writes: ["update"],
		}),
		filter: defineProp<string>()({
			label: "Filter",
			hint: "Only rows whose filtered field holds these words are listed. Bind a search field and the two move together.",
			default: "",
			writes: ["update"],
			wants: "@default/search-input/value",
		}),
		filterField: defineProp<string>()({
			label: "Filtered field",
			hint: "The field the filter is matched in.",
			default: "title",
		}),
		pageSize: defineProp<number>()({
			label: "Rows per page",
			hint: "How many rows are read at first, and how many more each press of Show more reads.",
			default: PAGE_SIZE,
		}),
		heading: defineProp<string>()({
			label: "Heading",
			hint: "A line above the rows. Left empty, none is drawn.",
			default: "",
		}),
	},
});

export default createWidget(
	manifest,
	({ rows, handedAs, selection, filter, filterField, pageSize, heading, slots }) => {
		const step = askedSize(useData(pageSize.get).data);
		const [shown, setShown] = useState(step);
		useEffect(() => setShown(step), [step]);

		const asked = saidOf(useData(filter.get).data);
		const field = saidOf(useData(filterField.get).data);
		const page = useData(rows.list, { where: whereFieldHolds(field, asked), limit: shown });
		const everyRow = useData(rows.list, { limit: 1 });
		const picked = pickedValue(useData(selection.get).data) as string;
		const givenAs = saidOf(useData(handedAs.get).data) || "row";
		const title = saidOf(useData(heading.get).data);

		const said = saidInstead({ slot: slots?.row as RowSlot, page, everyRow, isFiltered: asked !== "" });
		const onClear = said?.canClear && canDo(filter.update) ? () => void filter.update("") : null;
		const onPick = canDo(selection.update) ? (ref: string) => void selection.update(ref) : null;

		return (
			<div className="wg-list">
				<style>{CSS}</style>
				{title === "" ? null : <h3 className="wg-list-heading">{title}</h3>}
				{said ? (
					<Instead said={said} onClear={onClear} />
				) : (
					<Drawing
						rows={rows}
						Drawn={slots?.row as Drawn}
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
);

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

function Instead({ said, onClear }: { said: Said; onClear: (() => void) | null }) {
	return (
		<div className={said.tone === "muted" ? "wg-list-said" : `wg-list-said is-${said.tone}`}>
			<p>{said.text}</p>
			{said.count === null ? null : <p>{said.count}</p>}
			{onClear === null ? null : (
				<Button size="s" onClick={onClear}>
					{CLEAR_THE_FILTER}
				</Button>
			)}
		</div>
	);
}

type DrawingProps = {
	rows: Rows;
	Drawn: Drawn;
	page: Reading;
	givenAs: string;
	picked: string;
	onPick: ((ref: string) => void) | null;
};

function Drawing({ rows, Drawn, page, givenAs, picked, onPick }: DrawingProps) {
	return (
		<div className="wg-list-body">
			<SlotList slot={Drawn}>
				{(page.data as Entry[]).map((row) => (
					<Pick
						key={String(row.ref)}
						isPicked={String(row.ref) === picked}
						onPick={onPick === null ? null : () => onPick(String(row.ref))}
					>
						<RowInSlot Drawn={Drawn} rows={rows} row={row} givenAs={givenAs} />
					</Pick>
				))}
			</SlotList>
		</div>
	);
}

function Pick({ isPicked, onPick, children }: { isPicked: boolean; onPick: (() => void) | null; children: ReactNode }) {
	if (onPick === null) return <div className="wg-list-pick">{children}</div>;
	return (
		<div
			className="wg-list-pick"
			data-picked={isPicked ? "" : undefined}
			role="button"
			tabIndex={0}
			aria-pressed={isPicked}
			onClick={onPick}
			onKeyDown={(event: KeyboardEvent) => {
				if (!PRESS_KEYS.includes(event.key)) return;
				event.preventDefault();
				onPick();
			}}
		>
			{children}
		</div>
	);
}

function RowInSlot({ Drawn, rows, row, givenAs }: { Drawn: Drawn; rows: Rows; row: Entry; givenAs: string }) {
	return <Drawn {...{ [givenAs]: useRowSource(rows, row) }} />;
}

// TRADE-OFF: the row's contents go in the gateway id; one id per ref settles once and never reads the changed row again
function useRowSource(rows: Rows, row: Entry): ValueGateway<VaultRecord> {
	const stamp = JSON.stringify(row);
	return useMemo(
		() =>
			valueGateway<VaultRecord>({
				id: `${rows.id}#${String(row.ref)}#${stamp}`,
				handlers: {
					get: () => row,
					update: (next: VaultRecord) => rows.update({ ref: row.ref, data: next }),
				},
				cans: { update: () => rows.update.can() },
				settlesNow: true,
			}),
		[rows, row.ref, stamp],
	) as ValueGateway<VaultRecord>;
}

function Foot({
	shown,
	total,
	step,
	onMore,
}: {
	shown: number;
	total: number | null;
	step: number;
	onMore: () => void;
}) {
	const left = total === null ? 0 : total - shown;
	return (
		<div className="wg-list-foot">
			<span>{total === null ? COUNTED.replace(TOTAL, String(shown)) : saidCount(shown, total)}</span>
			{left <= 0 ? null : (
				<Button size="s" onClick={onMore}>
					{SHOW_MORE.replace(COUNT, String(Math.min(step, left)))}
				</Button>
			)}
		</div>
	);
}

function saidCount(shown: number, total: number): string {
	if (shown >= total) return COUNTED.replace(TOTAL, String(total));
	return SHOWN_OF_ALL.replace(SHOWN, String(shown)).replace(TOTAL, String(total));
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
