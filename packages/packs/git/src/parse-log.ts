import type { Commit } from "./schemas.js";

export const RECORD = "\u001e";
export const FIELD = "\u001f";

export const LOG_FORMAT = "--format=%x1e%H%x1f%P%x1f%an%x1f%aI%x1f%s";

export function commitsIn(output: string): Commit[] {
	return output
		.split(RECORD)
		.slice(1)
		.map((chunk) => commitOf(chunk));
}

function commitOf(chunk: string): Commit {
	const [head = "", ...rest] = chunk.split("\n");
	const [sha = "", parents = "", author = "", at = "", subject = ""] = head.split(FIELD);
	const stat = rest.join(" ");
	return {
		sha,
		subject,
		author,
		at,
		parents: parents.split(" ").filter((parent) => parent !== ""),
		...countIn(stat, /(\d+) files? changed/, "files"),
		...countIn(stat, /(\d+) insertions?\(\+\)/, "added"),
		...countIn(stat, /(\d+) deletions?\(-\)/, "removed"),
	};
}

function countIn(stat: string, pattern: RegExp, key: "files" | "added" | "removed"): Partial<Commit> {
	const found = pattern.exec(stat)?.[1];
	return found === undefined ? {} : { [key]: Number(found) };
}
