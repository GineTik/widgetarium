// Deciding whether a record satisfies a filter is not Obsidian's business — the same rules
// have to hold for a REST adapter and for a test. Kept here so a test can exercise the REAL
// matcher instead of a copy of it, which is how a broken operator went unnoticed.

export function valueOf(record, prop) {
	if (prop === "name" || prop === "title") return record.name;
	if (prop === "path") return record.path;
	return record.props?.[prop];
}

const OPERATIONS = {
	eq: (left, right) => left === right,
	is: (left, right) => left === right,
	ne: (left, right) => left !== right,
	// The RECORD's side can be a list too — a task has several assignees — and then the
	// question is whether the two lists meet. Comparing a list against a list with includes()
	// answered false for every task that had more than one of anything.
	in: (left, right) => {
		if (!Array.isArray(right)) return false;
		const held = Array.isArray(left) ? left : [left];
		return held.some((value) => right.includes(value));
	},
	contains: (left, right) => String(left ?? "").toLowerCase().includes(String(right).toLowerCase()),
	gt: (left, right) => left > right,
	lt: (left, right) => left < right,
	exists: (left, right) => (right === false ? left == null : left != null),
};

export function matches(record, where) {
	if (!where || where.length === 0) return true;
	return where.every((clause) => {
		const name = clause.op ?? "eq";
		const operation = OPERATIONS[name];
		// An unknown operator used to return true, so a filter nobody had implemented let
		// EVERY row through and looked like it was working. Say it and drop the row instead.
		if (!operation) {
			console.warn(`Widgetarium: filter operator "${name}" is not known — the clause is ignored`);
			return true;
		}
		return operation(valueOf(record, clause.prop), clause.value);
	});
}

export const KNOWN_OPERATORS = Object.keys(OPERATIONS);
