import { FIELD } from "./parse-log.js";
import type { Branch, Tag } from "./schemas.js";

export const BRANCH_FORMAT =
	"--format=%(refname)%1f%(refname:short)%1f%(HEAD)%1f%(upstream:short)%1f%(upstream:track,nobracket)%1f%(objectname)";

export const TAG_FORMAT = "--format=%(refname:short)%1f%(objectname)%1f%(creatordate:iso-strict)";

export function branchesIn(output: string): Branch[] {
	return linesOf(output)
		.map((line) => line.split(FIELD))
		.filter(([, short = ""]) => !short.endsWith("/HEAD"))
		.map(([full = "", name = "", head = "", upstream = "", track = "", sha = ""]) => ({
			name,
			isCurrent: head === "*",
			isRemote: full.startsWith("refs/remotes/"),
			upstream: upstream === "" ? null : upstream,
			ahead: countIn(track, /ahead (\d+)/),
			behind: countIn(track, /behind (\d+)/),
			head: sha,
		}));
}

export function tagsIn(output: string): Tag[] {
	return linesOf(output).map((line) => {
		const [name = "", sha = "", at = ""] = line.split(FIELD);
		return { name, sha, at: at === "" ? null : at };
	});
}

export function linesOf(output: string): string[] {
	return output.split("\n").filter((line) => line.trim() !== "");
}

function countIn(track: string, pattern: RegExp): number {
	return Number(pattern.exec(track)?.[1] ?? 0);
}
