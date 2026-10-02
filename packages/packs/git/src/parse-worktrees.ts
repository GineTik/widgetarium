import type { Worktree } from "./schemas.js";

export function worktreesIn(output: string): Worktree[] {
	return output
		.split(/\n\s*\n/)
		.map((block) => block.split("\n").filter((line) => line !== ""))
		.filter((lines) => lines.length > 0)
		.map((lines, index) => worktreeOf(lines, index === 0));
}

function worktreeOf(lines: readonly string[], isMain: boolean): Worktree {
	const valueOf = (key: string): string | null => {
		const line = lines.find((held) => held === key || held.startsWith(`${key} `));
		return line === undefined ? null : line.slice(key.length).trim();
	};
	const branch = valueOf("branch");
	return {
		path: valueOf("worktree") ?? "",
		branch: branch === null ? null : branch.replace(/^refs\/heads\//, ""),
		head: valueOf("HEAD") ?? "",
		isMain,
		isLocked: valueOf("locked") !== null,
		isPrunable: valueOf("prunable") !== null,
	};
}
