import type { KeyboardEvent, ReactNode } from "react";
import { Card } from "widgetarium/kit";
import { EntryGo } from "./entry-go";
import { EntryLines } from "./entry-lines";
import type { Entry, Job } from "./types";
import { useEntryActions } from "./use-entry-actions";
import type { EntryCommands } from "./use-entry-actions";

interface EntryCardProps extends EntryCommands {
	readonly entry: Entry;
	readonly isAsking: boolean;
	readonly Preview: (props: { readonly widget: string }) => ReactNode;
}

const VERB = { add: "Add", install: "Install", update: "Update", failed: "Retry" } as const;

export function EntryCard({ entry, isAsking, Preview, ...commands }: EntryCardProps) {
	const busyJob = busyJobOf(entry.job);
	const isBusy = busyJob !== null;
	const state = entry.job?.state === "failed" ? "failed" : entry.action;
	const label = `${VERB[state]} ${entry.name}`;
	const { failure, press, lift } = useEntryActions({ entry, state, isBusy, isAsking, commands });
	return (
		<Card asChild className="wg-catalogue-card">
			<article
				role="button"
				tabIndex={0}
				aria-label={label}
				data-state={isBusy ? "busy" : state}
				onClick={press}
				onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
					if (event.key === "Enter" || event.key === " ") press();
				}}
				onPointerDown={lift}
			>
				<Card className="wg-catalogue-card-stage">
					<Preview widget={entry.id} />
				</Card>
				<div className="wg-catalogue-card-foot">
					<span className="wg-catalogue-card-said" title={entry.id}>
						<span className="wg-catalogue-card-scope">{entry.scope}</span>
						<span className="wg-catalogue-card-scope">/</span>
						<span className="wg-catalogue-card-name">{entry.name}</span>
					</span>
					<EntryGo busyJob={busyJob} state={state} label={label} press={press} />
				</div>
				<EntryLines entry={entry} failure={failure} />
			</article>
		</Card>
	);
}

function busyJobOf(job: Job | null): Job | null {
	return job !== null && job.state !== "failed" ? job : null;
}
