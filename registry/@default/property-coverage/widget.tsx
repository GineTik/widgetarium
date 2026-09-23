import { useEffect, useState } from "react";
import { createWidget, defineManifest, defineProp, useData } from "widgetarium";
import type { VaultRecord } from "widgetarium";
import { Button } from "widgetarium/kit";
import { askedCount, COUNTED_CEILING, countedFirstLine, heldProperties } from "@default/lib";

const SHOWN_AT_FIRST = 10;
const STEP = 10;
const READING = "Reading…";
const NO_NOTES = "There are no notes here yet.";
const NO_PROPERTIES = "None of these notes carries a property.";
const LEFT_OUT = "{count} more properties";
const SHOW_MORE = "Show {count} more";

type Coverage = { key: string; filled: number; share: number };

export const manifest = defineManifest({
	title: "Property coverage",
	description: "Which properties the notes of a collection actually carry, and how many of them are filled in.",
	keywords: [
		"properties",
		"frontmatter",
		"metadata",
		"coverage",
		"fields",
		"schema",
		"completeness",
		"hygiene",
		"analytics",
		"statistics",
		"audit",
		"filled",
		"missing",
	],
	role: "collection",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 220, stackBelowPx: 320 },
	preview: {
		size: { w: 5, h: 4 },
		props: {
			records: {
				rows: [
					{ path: "Books/One.md", name: "One", author: "A", status: "Reading", rating: 5 },
					{ path: "Books/Two.md", name: "Two", author: "B", status: "Finished" },
					{ path: "Books/Three.md", name: "Three", status: "To read" },
				],
			},
		},
	},
	props: {
		records: defineProp<VaultRecord[]>()({
			label: "Records",
			hint: "The notes whose properties are counted.",
			default: [],
		}),
		shownAtFirst: defineProp<number>()({
			label: "Properties shown at first",
			hint: "How many of the most used properties get a row before anything is pressed.",
			aka: ["shown"],
			default: SHOWN_AT_FIRST,
		}),
		step: defineProp<number>()({
			label: "Properties added by a press",
			hint: "How many more rows each press of Show more draws.",
			default: STEP,
		}),
		showMoreButton: defineProp<boolean>()({
			hint: "Whether a press may draw past the first rows. Without it the rest are named as a count.",
			default: true,
		}),
	},
});

export default createWidget(manifest, ({ records, shownAtFirst, step, showMoreButton }) => {
	const read = useData(records.list, { limit: COUNTED_CEILING });
	const atFirst = askedCount(useData(shownAtFirst.get).data, SHOWN_AT_FIRST);
	const added = askedCount(useData(step.get).data, STEP);
	const mayShowMore = useData(showMoreButton.get).data !== false;
	const [shown, setShown] = useState(atFirst);
	useEffect(() => setShown(atFirst), [atFirst]);

	if (read.failure !== null) return <Line tone="var(--text-error)" text={read.failure} />;
	if (read.isLoading && read.data.length === 0) return <Line tone="var(--text-faint)" text={READING} />;
	if (read.data.length === 0) return <Line tone="var(--wg-kit-text-muted)" text={NO_NOTES} />;

	return (
		<Meters
			coverage={coverageOf(read.data)}
			shown={shown}
			step={added}
			onMore={mayShowMore ? () => setShown(shown + added) : null}
			counted={read.data.length}
			total={read.total}
		/>
	);
});

type MetersProps = {
	coverage: Coverage[];
	shown: number;
	step: number;
	onMore: (() => void) | null;
	counted: number;
	total: number | null;
};

function Meters({ coverage, shown, step, onMore, counted, total }: MetersProps) {
	if (coverage.length === 0) return <Line tone="var(--wg-kit-text-muted)" text={NO_PROPERTIES} />;
	const top = coverage.slice(0, shown);

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "var(--wg-gap-items)" }}>
			{top.map((property) => (
				<Meter key={property.key} coverage={property} counted={counted} />
			))}
			<More left={coverage.length - top.length} step={step} onMore={onMore} />
			<Ceiling total={total} />
		</div>
	);
}

function Meter({ coverage, counted }: { coverage: Coverage; counted: number }) {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "var(--wg-gap-parts)" }}>
			<MeterLabel coverage={coverage} counted={counted} />
			<div className="coverage-track">
				<div className="coverage-fill" style={{ width: `${Math.max(2, coverage.share)}%` }} />
			</div>
		</div>
	);
}

function MeterLabel({ coverage, counted }: { coverage: Coverage; counted: number }) {
	return (
		<div style={{ display: "flex", justifyContent: "space-between", gap: "var(--wg-gap-parts)" }}>
			<span>{coverage.key}</span>
			<span style={{ color: "var(--wg-kit-text-muted)" }}>
				{coverage.filled} of {counted} · {coverage.share}%
			</span>
		</div>
	);
}

function More({ left, step, onMore }: { left: number; step: number; onMore: (() => void) | null }) {
	if (left === 0) return null;
	if (onMore === null) return <Line tone="var(--text-faint)" text={LEFT_OUT.replace("{count}", String(left))} />;
	return (
		<Button size="s" onClick={onMore}>
			{SHOW_MORE.replace("{count}", String(Math.min(step, left)))}
		</Button>
	);
}

function Ceiling({ total }: { total: number | null }) {
	const said = countedFirstLine(total);
	if (said === null) return null;
	return <Line tone="var(--text-faint)" text={said} />;
}

function Line({ tone, text }: { tone: string; text: string }) {
	return <div style={{ color: tone }}>{text}</div>;
}

function coverageOf(rows: VaultRecord[]): Coverage[] {
	const filled = new Map<string, number>();
	for (const row of rows) {
		for (const key of filledKeysOf(row)) filled.set(key, (filled.get(key) ?? 0) + 1);
	}
	return [...filled].map(([key, count]) => shareOf(key, count, rows.length)).sort(mostFilledFirst);
}

function shareOf(key: string, count: number, counted: number): Coverage {
	return { key, filled: count, share: Math.round((count / counted) * 100) };
}

function mostFilledFirst(one: Coverage, two: Coverage): number {
	return two.filled - one.filled || one.key.localeCompare(two.key);
}

function filledKeysOf(row: VaultRecord): string[] {
	return Object.entries(heldProperties(row))
		.filter(([, value]) => isFilled(value))
		.map(([key]) => key);
}

function isFilled(value: unknown): boolean {
	if (value === null || value === undefined || value === "") return false;
	return Array.isArray(value) ? value.length > 0 : true;
}
