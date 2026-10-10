import { createElement as h, Fragment } from "react";
import type { Entry } from "./types.js";

const WRITING = "Writing {done} of {total} files";
const FETCHING = "Fetching";
const OUTDATED = "{here} here · {there} out";

export function EntryLines({ entry, failure }: { readonly entry: Entry; readonly failure: string | null }) {
	const step = stepOf(entry);
	const shownFailure = failure || entry.job?.failure;
	return (
		<>
			{step ? <p className="wg-studio-catalogue-card-step">{step}</p> : null}
			{entry.description ? <p className="wg-studio-catalogue-card-what">{entry.description}</p> : null}
			{entry.lacks ? <p className="wg-studio-catalogue-card-lack">{entry.lacks}</p> : null}
			{shownFailure ? <p className="wg-studio-catalogue-card-lack is-failure">{shownFailure}</p> : null}
		</>
	);
}

function stepOf({ job, update }: Entry): string | null {
	if (job?.state === "writing")
		return WRITING.replace("{done}", String(job.done)).replace("{total}", String(job.total));
	if (job?.state === "fetching") return FETCHING;
	if (update) return OUTDATED.replace("{here}", update.here).replace("{there}", update.there);
	return null;
}
