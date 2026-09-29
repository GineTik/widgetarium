import { createElement as h } from "react";
import { useSyncExternalStore } from "react";

const ONE_LEFT_OUT = "1 record was left out:";

const MANY_LEFT_OUT = "{count} records were left out:";

const ISSUE_LINE = "{label} — {field}: {message}";

export function ProblemsMark({ store, propRef }) {
	const problems = useSyncExternalStore(store.subscribe, () => store.of(propRef));
	if (problems.length === 0) return null;
	const heading = problems.length === 1 ? ONE_LEFT_OUT : MANY_LEFT_OUT.replace("{count}", String(problems.length));
	const lines = problems.flatMap((problem) =>
		problem.issues.map((issue) =>
			ISSUE_LINE.replace("{label}", problem.label)
				.replace("{field}", issue.path.map(String).join(".") || "record")
				.replace("{message}", issue.message),
		),
	);
	return h(
		"span",
		{ className: "wg-set-problems", role: "img", "aria-label": heading, title: [heading, ...lines].join("\n") },
		"!",
	);
}
