import { Mounted, createWidget, defineManifest, defineProp, useData } from "widgetarium";
import type { CollectionGatewayOf, MountEntry, RecordRef, Slot, ValueGatewayOf } from "widgetarium";
import { Layout, Pill, Card } from "widgetarium/kit";

type Item = { ref: RecordRef };

type Arrangement = "column" | "row" | "grid" | "rows";

const KIND_OF: Record<Arrangement, string> = { column: "stack", row: "row", grid: "grid", rows: "rows" };

const PLACED = "placed";
const PER_ROW = "per-row";

const STYLE = `
.wg-section { display: flex; flex-direction: column; gap: var(--wg-gap-parts, 12px); }
.wg-section-head { display: flex; align-items: center; gap: var(--wg-gap-items, 8px); }
.wg-section-title { margin: 0; font-size: var(--font-ui-large, 18px); font-weight: 600; }
.wg-section-controls { margin-left: auto; display: flex; align-items: center; gap: var(--wg-gap-items, 8px); }
.wg-section-stands { min-width: 0; }
.wg-section-empty { font-size: var(--font-ui-small, 13px); color: var(--wg-kit-text-muted); }
`;

export const manifest = defineManifest({
	title: "Section",
	description:
		"A titled part of a screen: the heading, what it says about itself, the controls beside it, and the widgets standing under it.",
	keywords: ["section", "group", "region", "heading", "title", "block", "layout", "container", "grid", "list"],
	role: "layout",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 200, stackBelowPx: 360 },
	mounts: {
		controls: {
			label: "Controls",
			hint: "Widgets standing at the end of the heading row. They govern this section and nothing else.",
			default: [],
		},
		widgets: {
			label: "Widgets",
			hint: "Each widget you place stands in the body, in the order listed here.",
			default: [],
			isVisible: (props) => props.filling?.value !== PER_ROW,
		},
	},
	slots: {
		item: {
			label: "Drawn for every row",
			surface: "none",
			isVisible: (props) => props.filling?.value === PER_ROW,
		},
	},
	props: {
		heading: defineProp<string>()({
			hint: "What this part of the screen is.",
			default: "Section",
			control: "line",
			writes: ["update"],
		}),
		badgeTone: defineProp<string>()({
			design: true,
			label: "What the badge says it is",
			hint: "The colour a badge wears is its meaning: a count is neutral, a problem is an error.",
			options: [
				{ value: "neutral", label: "Neutral" },
				{ value: "accent", label: "Accent" },
				{ value: "success", label: "Going well" },
				{ value: "warning", label: "Needs a look" },
				{ value: "error", label: "Something is wrong" },
				{ value: "info", label: "Information" },
				{ value: "note", label: "A note" },
				{ value: "standout", label: "Stands out" },
				{ value: "highlight", label: "Highlighted" },
			],
			default: "neutral",
			writes: ["update"],
			isVisible: (props) => Boolean(props.badge?.value),
		}),
		badge: defineProp<string>()({
			hint: "A count or a state, beside the heading. It says something about the body, never a filter.",
			default: "",
			control: "line",
			writes: ["update"],
		}),
		filling: defineProp<string>()({
			label: "What fills it",
			hint: "Placed: you put each widget in yourself. Per row: one widget is drawn again for every row of the data.",
			options: [
				{ value: PLACED, label: "Widgets I place" },
				{ value: PER_ROW, label: "One widget per row of data" },
			],
			default: PLACED,
			writes: ["update"],
		}),
		arrangement: defineProp<string>()({
			design: true,
			label: "How they stand",
			hint: "A column reads down with nothing under it. A row and a grid give each widget its own plate. Rows stand in one plate with a line between them.",
			options: [
				{ value: "column", label: "Down the column" },
				{ value: "row", label: "Across the row, a plate each" },
				{ value: "grid", label: "A grid that wraps, a plate each" },
				{ value: "rows", label: "Rows in one plate" },
			],
			default: "column",
			writes: ["update"],
		}),
		minWidthPx: defineProp<number>()({
			design: true,
			label: "Narrowest a cell may be",
			hint: "The grid fits as many across as this allows, then wraps.",
			default: 240,
			writes: ["update"],
			isVisible: (props) => props.arrangement?.value === "grid",
		}),
		items: defineProp<Item[]>()({
			label: "Rows to draw",
			hint: "Bind the folder whose notes this section draws. The widget in the slot draws one of them at a time.",
			default: [],
			writes: ["create", "update", "remove"],
			isVisible: (props) => props.filling?.value === PER_ROW,
		}),
		pageSize: defineProp<number>()({
			label: "Rows drawn",
			hint: "How many rows are drawn before the rest are asked for.",
			default: 24,
			isVisible: (props) => props.filling?.value === PER_ROW,
		}),
	},
});

function Controls({ held }: { held: MountEntry[] }) {
	const shown = held.filter((entry) => !entry.hidden && !entry.problem);
	if (shown.length === 0) return null;
	return (
		<div className="wg-section-controls">
			{shown.map((entry) => (
				<Mounted key={entry.name} entry={entry} />
			))}
		</div>
	);
}

function Placed({ held }: { held: MountEntry[] }) {
	if (held.length === 0) return <div className="wg-section-empty">Nothing stands here yet.</div>;
	return (
		<>
			{held
				.filter((entry) => !entry.hidden)
				.map((entry) => (
					<Stands key={entry.name} entry={entry} />
				))}
		</>
	);
}

function Stands({ entry }: { entry: MountEntry }) {
	if (entry.surface)
		return (
			<Card type={entry.surface} className="wg-section-stands">
				<Mounted entry={entry} />
			</Card>
		);
	return (
		<Layout.Item className="wg-section-stands">
			<Mounted entry={entry} />
		</Layout.Item>
	);
}

function Head({ heading, badge, badgeTone, controls }: HeadProps) {
	const mark = useData(badge.get).data ?? "";
	const tone = useData(badgeTone.get).data ?? "neutral";
	return (
		<div className="wg-section-head">
			<h2 className="wg-section-title">{useData(heading.get).data ?? ""}</h2>
			{mark ? <Pill tone={tone}>{mark}</Pill> : null}
			<Controls held={controls} />
		</div>
	);
}

type HeadProps = {
	heading: ValueGatewayOf<string>;
	badge: ValueGatewayOf<string>;
	badgeTone: ValueGatewayOf<string>;
	controls: MountEntry[];
};

const heldIn = (mounts: Record<string, MountEntry[]> | undefined, name: string) => mounts?.[name] ?? [];

function Body({ filling, items, pageSize, Drawn, placed, kind, narrowest }: BodyProps) {
	const limit = useData(pageSize.get).data ?? 24;
	const rows = useData(items.list, { limit }).data ?? [];
	const isPerRow = (useData(filling.get).data ?? PLACED) === PER_ROW;
	return (
		<Layout kind={kind} min={narrowest}>
			{isPerRow ? <PerRow Drawn={Drawn} rows={rows} /> : <Placed held={placed} />}
		</Layout>
	);
}

function PerRow({ Drawn, rows }: { Drawn: Slot<Record<string, unknown>> | undefined; rows: Item[] }) {
	if (!Drawn) return null;
	return (
		<>
			{rows.map((row) => (
				<Layout.Item key={String(row.ref)}>
					<Drawn {...row} />
				</Layout.Item>
			))}
		</>
	);
}

type BodyProps = {
	filling: ValueGatewayOf<string>;
	items: CollectionGatewayOf<Item>;
	pageSize: ValueGatewayOf<number>;
	Drawn: Slot<Record<string, unknown>> | undefined;
	placed: MountEntry[];
	kind: string;
	narrowest: number;
};

export default createWidget(
	manifest,
	({ heading, badge, badgeTone, filling, arrangement, minWidthPx, items, pageSize, mounts, slots }) => {
		const standing = (useData(arrangement.get).data ?? "column") as Arrangement;

		return (
			<section className="wg-section">
				<style>{STYLE}</style>
				<Head heading={heading} badge={badge} badgeTone={badgeTone} controls={heldIn(mounts, "controls")} />
				<Body
					filling={filling}
					items={items}
					pageSize={pageSize}
					Drawn={slots?.item as Slot<Record<string, unknown>> | undefined}
					placed={heldIn(mounts, "widgets")}
					kind={KIND_OF[standing] ?? "stack"}
					narrowest={useData(minWidthPx.get).data ?? 240}
				/>
			</section>
		);
	},
);
