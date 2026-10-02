import { linesOf } from "./parse-refs.js";
import type { FileChange } from "./schemas.js";

type Change = FileChange["change"];

export interface LineCounts {
	readonly added: number;
	readonly removed: number;
}

const CHANGE_OF_LETTER: Readonly<Record<string, Change>> = {
	A: "added",
	"?": "added",
	M: "modified",
	T: "modified",
	D: "deleted",
	R: "renamed",
	C: "added",
};

export function statusIn(output: string, counts: ReadonlyMap<string, LineCounts>): FileChange[] {
	const parts = output.split("\u0000");
	const changes: FileChange[] = [];
	for (let at = 0; at < parts.length; at += 1) {
		const entry = parts[at] ?? "";
		if (entry.length < 4) continue;
		const staged = entry[0] ?? " ";
		const unstaged = entry[1] ?? " ";
		const filePath = entry.slice(3);
		const letter = staged !== " " && staged !== "?" ? staged : unstaged;
		const isRename = letter === "R" || letter === "C";
		const from = isRename ? parts[(at += 1)] : undefined;
		changes.push({
			filePath,
			change: CHANGE_OF_LETTER[letter] ?? "modified",
			...(from ? { from } : {}),
			...(counts.get(filePath) ?? { added: 0, removed: 0 }),
			isStaged: staged !== " " && staged !== "?",
		});
	}
	return changes;
}

export function lineCountsIn(...outputs: readonly string[]): Map<string, LineCounts> {
	const counts = new Map<string, LineCounts>();
	for (const line of outputs.flatMap(linesOf)) {
		const [added = "0", removed = "0", ...path] = line.split("\t");
		const filePath = renamedPathOf(path.join("\t"));
		const before = counts.get(filePath) ?? { added: 0, removed: 0 };
		counts.set(filePath, {
			added: before.added + (Number(added) || 0),
			removed: before.removed + (Number(removed) || 0),
		});
	}
	return counts;
}

export function committedChangesIn(nameStatus: string, counts: ReadonlyMap<string, LineCounts>): FileChange[] {
	return linesOf(nameStatus).map((line) => {
		const [status = "M", first = "", second] = line.split("\t");
		const letter = status[0] ?? "M";
		const filePath = second ?? first;
		return {
			filePath,
			change: CHANGE_OF_LETTER[letter] ?? "modified",
			...(second ? { from: first } : {}),
			...(counts.get(filePath) ?? { added: 0, removed: 0 }),
		};
	});
}

function renamedPathOf(path: string): string {
	const braced = /^(.*)\{(.*) => (.*)\}(.*)$/.exec(path);
	if (braced) return `${braced[1] ?? ""}${braced[3] ?? ""}${braced[4] ?? ""}`;
	const arrow = path.split(" => ");
	return arrow[arrow.length - 1] ?? path;
}
