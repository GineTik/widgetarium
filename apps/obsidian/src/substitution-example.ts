import { createElement as h } from "react";
import type { FormEvent, ReactElement } from "react";
import { Icon } from "@widgetarium/kit";
import { previewHere, previewHost, previewNavigator, previewReader } from "@widgetarium/core/preview.js";
import type { ViewHost } from "@widgetarium/core/gateway/host.js";
import type { WidgetLookup } from "@widgetarium/core/registry.js";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import { matchLines } from "./substitution.js";
import type { Rule } from "./substitution.js";
import { InlineWidget } from "./inline-widget.js";

export interface RuleExampleProps {
	readonly rule: Rule;
	readonly registry: WidgetLookup;
	readonly host: ViewHost | null | undefined;
	readonly sample: string;
	readonly onSample: (text: string) => void;
}

const SAMPLE_ROWS = { fewest: 2, most: 6 };

export function RuleExample({ rule, registry, host, sample, onSample }: RuleExampleProps): ReactElement {
	const lines = sample.split("\n");

	return h("div", { className: "wg-sub-example" }, [
		h("textarea", {
			key: "in",
			className: "wg-sub-sample",
			value: sample,
			spellCheck: false,
			rows: Math.min(SAMPLE_ROWS.most, Math.max(SAMPLE_ROWS.fewest, lines.length)),
			onInput: (event: FormEvent<HTMLTextAreaElement>) => onSample(event.currentTarget.value),
		}),
		h("span", { key: "turn", className: "wg-sub-arrow" }, h(Icon, { name: "chevron", size: 16 })),
		h("div", { key: "out", className: "wg-sub-out" }, drawLines(lines, rule, registry, host)),
	]);
}

function drawLines(
	lines: readonly string[],
	rule: Rule,
	registry: WidgetLookup,
	host: ViewHost | null | undefined,
): ReactElement[] {
	const spans = matchLines(lines, [{ ...rule, draft: false, enabled: true }]);
	const definition = registry.get(rule.widget);
	const manifest = definition?.manifest;
	const out: ReactElement[] = [];
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
				reader: previewReader(isObject(manifest) ? manifest : null),
				host: previewHost(host),
				raw: lines.slice(span.from, span.to + 1).join("\n"),
			}),
		);
		at = span.to + 1;
	}
	return out;
}
