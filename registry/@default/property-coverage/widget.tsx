import { useEffect, useState } from "react";
import {
	IQuery,
	VaultRecordSchema,
	type VaultRecord,
	createWidget,
	defineLayout,
	defineMetadata,
	useData,
	z,
} from "widgetarium";
import { COUNTED_CEILING, Line } from "widgetarium/kit";
import { askedCount, heldProperties } from "@default/lib";
import { Meters } from "./meters";
import type { Coverage } from "./types";

const SHOWN_AT_FIRST = 10;
const STEP = 10;
const READING = "Reading…";
const NO_NOTES = "There are no notes here yet.";

const PropertyCoverage = createWidget({
	inject: {
		getRecords: IQuery.of(z.array(VaultRecordSchema)),
		getShownAtFirst: IQuery.of(z.number().default(SHOWN_AT_FIRST)),
		getStep: IQuery.of(z.number().default(STEP)),
		getShowMoreButton: IQuery.of(z.boolean().default(true)),
	},
	draw: ({ getRecords, getShownAtFirst: shownAtFirst, getStep: step, getShowMoreButton: showMoreButton }) => {
		const read = useData(getRecords, { limit: COUNTED_CEILING });
		const atFirst = askedCount(shownAtFirst, SHOWN_AT_FIRST);
		const added = askedCount(step, STEP);
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
				onMore={showMoreButton ? () => setShown(shown + added) : null}
				counted={read.data.length}
				total={read.total}
			/>
		);
	},
});

export const metadata = defineMetadata(PropertyCoverage, {
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
	preview: {
		size: { w: 5, h: 4 },
		props: {
			getRecords: {
				rows: [
					{ path: "Books/One.md", name: "One", author: "A", status: "Reading", rating: 5 },
					{ path: "Books/Two.md", name: "Two", author: "B", status: "Finished" },
					{ path: "Books/Three.md", name: "Three", status: "To read" },
				],
			},
		},
	},
	props: {
		getRecords: { hint: "The notes whose properties are counted.", aka: ["records"] },
		getShownAtFirst: {
			label: "Properties shown at first",
			hint: "How many of the most used properties get a row before anything is pressed.",
			aka: ["shownAtFirst", "shown"],
		},
		getStep: {
			label: "Properties added by a press",
			hint: "How many more rows each press of Show more draws.",
			aka: ["step"],
		},
		getShowMoreButton: {
			hint: "Whether a press may draw past the first rows. Without it the rest are named as a count.",
			aka: ["showMoreButton"],
		},
	},
});

export const layout = defineLayout({
	role: "collection",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 220, stackBelowPx: 320 },
});

export default PropertyCoverage;

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
