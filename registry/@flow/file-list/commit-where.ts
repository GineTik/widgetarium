export function commitWhereOf(commit: unknown) {
	if (commit === undefined || commit === null || commit === "") return [];
	if (!Array.isArray(commit)) return [{ prop: "commit", op: "is", value: commit }];
	return commit.length === 0 ? [] : [{ prop: "commit", op: "in", value: commit }];
}
