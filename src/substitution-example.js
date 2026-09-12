import { createElement as h } from "react";
import { Icon } from "./kit.js";
import { matchLines } from "./substitution.js";
import { previewHere, previewHost, previewNavigator, previewReader } from "./preview.js";
import { InlineWidget } from "./inline-render.js";

const SAMPLE_ROWS = { fewest: 2, most: 6 };

export function RuleExample({ rule, registry, host, sample, onSample }) {
	const lines = sample.split("\n");

	return h("div", { className: "wg-sub-example" }, [
		h("textarea", {
			key: "in",
			className: "wg-sub-sample",
			value: sample,
			spellCheck: false,
			rows: Math.min(SAMPLE_ROWS.most, Math.max(SAMPLE_ROWS.fewest, lines.length)),
			onInput: (event) => onSample(event.target.value),
		}),
		h("span", { key: "turn", className: "wg-sub-arrow" }, h(Icon, { name: "chevron", size: 16 })),
		h("div", { key: "out", className: "wg-sub-out" }, drawnLines(lines, rule, registry, host)),
	]);
}

function drawnLines(lines, rule, registry, host) {
	const spans = matchLines(lines, [{ ...rule, draft: false, enabled: true }]);
	const definition = registry.get(rule.widget);
	const out = [];
	let at = 0;

	while (at < lines.length) {
		const span = spans.find((entry) => entry.from === at);
		if (!span) {
			out.push(h("p", { key: `p${at}`, className: "wg-sub-plain" }, lines[at] || " "));
			at += 1;
			continue;
		}
		out.push(
			h(InlineWidget, {
				key: `w${at}`,
				definition,
				here: previewHere(span.content),
				navigator: previewNavigator,
				reader: previewReader(definition?.manifest),
				host: previewHost(host),
				raw: lines.slice(span.from, span.to + 1).join("\n"),
			}),
		);
		at = span.to + 1;
	}
	return out;
}
