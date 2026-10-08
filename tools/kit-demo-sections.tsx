import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import { Grid } from "../packages/kit/src/index";
import { OverlaysShowcase } from "../packages/kit/src/showcase/index";
import type { OpenedOverlay, ShowcaseEntry, ShowcaseId } from "../packages/kit/src/showcase/index";
import { Section, WideSection } from "./kit-demo-frame.tsx";
import type { SectionProps } from "./kit-demo-frame.tsx";
import { CHAT_USAGE } from "./kit-demo-chat-usage.ts";
import { INPUTS_USAGE } from "./kit-demo-inputs-usage.ts";
import { LAYOUT_USAGE } from "./kit-demo-layout-usage.ts";
import { OVERLAYS_USAGE } from "./kit-demo-overlays-usage.ts";
import { BASICS_USAGE } from "./kit-demo-usage.ts";

export interface ShowcaseSectionsProps {
	readonly entries: readonly ShowcaseEntry[];
	readonly opened: OpenedOverlay;
}

interface EntryRun {
	readonly isWide: boolean;
	readonly entries: ShowcaseEntry[];
}

const OPENED_FROM_ADDRESS: ShowcaseId = "overlays";

const USAGE: Readonly<Record<ShowcaseId, string>> = {
	...BASICS_USAGE,
	...LAYOUT_USAGE,
	...CHAT_USAGE,
	...INPUTS_USAGE,
	overlays: OVERLAYS_USAGE,
};

export function ShowcaseSections({ entries, opened }: ShowcaseSectionsProps): ReactElement {
	const sectionOf = (entry: ShowcaseEntry): SectionProps => ({
		title: entry.title,
		note: entry.note,
		usage: USAGE[entry.id],
		paintsPlates: entry.paintsPlates,
		children: entry.id === OPENED_FROM_ADDRESS ? <OverlaysShowcase opened={opened} /> : <entry.Demo />,
	});
	return (
		<Fragment>
			{runsOf(entries).map((run) => {
				if (run.isWide) return run.entries.map((entry) => <WideSection key={entry.id} {...sectionOf(entry)} />);
				return (
					<Grid key={run.entries[0]?.id} min={340}>
						{run.entries.map((entry) => (
							<Section key={entry.id} {...sectionOf(entry)} />
						))}
					</Grid>
				);
			})}
		</Fragment>
	);
}

function runsOf(entries: readonly ShowcaseEntry[]): EntryRun[] {
	const runs: EntryRun[] = [];
	for (const entry of entries) {
		const isWide = entry.isWide === true;
		const last = runs.at(-1);
		if (last?.isWide === isWide) last.entries.push(entry);
		else runs.push({ isWide, entries: [entry] });
	}
	return runs;
}
