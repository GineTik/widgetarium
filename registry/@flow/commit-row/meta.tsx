import { COUNT, countOf, saidOf } from "./counts";
import type { Commit } from "./types";

const ONE_FILE = "1 file";
const MANY_FILES = "{count} files";

const SHA_LENGTH = 7;

export function Meta({ commit }: { commit: Commit }) {
	const sha = saidOf(commit.sha).slice(0, SHA_LENGTH);
	const files = filesLine(commit.files);
	const when = whenLine(commit.at);
	if (sha === "" && files === null && when === null) return null;

	return (
		<div className="fcr-meta">
			{sha === "" ? null : <span className="fcr-sha">{sha}</span>}
			{files === null ? null : <span className="fcr-files">{files}</span>}
			{when === null ? null : <span className="fcr-when">{when}</span>}
		</div>
	);
}

function filesLine(files: Commit["files"]): string | null {
	const count = countOf(files);
	if (count === null) return null;
	return count === 1 ? ONE_FILE : MANY_FILES.replace(COUNT, String(count));
}

function whenLine(at: Commit["at"]): string | null {
	const said = saidOf(at);
	if (said === "") return null;
	const moment = new Date(said);
	if (Number.isNaN(moment.getTime())) return said;
	return moment.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
