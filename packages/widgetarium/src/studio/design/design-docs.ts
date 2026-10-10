import { createElement as h } from "react";
import type { ReactElement } from "react";
import { RenderedMarkdown } from "@widgetarium/kit";
import { keptFeaturesOf } from "@widgetarium/core/app-spec.js";
import type { AppSpec } from "@widgetarium/core/app-spec.js";
import { Group } from "./design-group.js";
import { Region } from "./design-region.js";
import type { CanvasDoc } from "@widgetarium/core/engine/design-port.js";

export type { CanvasDoc };

export function DocsRegion({
	title,
	docs,
	host,
}: {
	title: string;
	docs: readonly CanvasDoc[];
	host: Parameters<typeof RenderedMarkdown>[0]["host"];
}): ReactElement | null {
	if (docs.length === 0) return null;
	return h(
		Region,
		{ title, count: docs.length },
		docs.map((doc) =>
			h(
				Group,
				{ key: doc.path, title: doc.name, sub: doc.path },
				h(RenderedMarkdown, {
					host,
					markdown: doc.markdown,
					path: doc.path,
					className: "wg-design-doc markdown-rendered",
					plainClassName: "wg-design-doc is-plain",
				}),
			),
		),
	);
}

export function specMarkdownOf(spec: AppSpec): string {
	const kept = keptFeaturesOf(spec);
	return [
		`**${spec.job}**`,
		"## Features",
		...kept.map(
			(feature) => `- **${feature.title}** — ${feature.says}${feature.mark === "suggested" ? " _(suggested)_" : ""}`,
		),
		"## Pages",
		...spec.pages.map((page) => `- **${page.name}** — ${page.says}`),
		spec.choices.length ? "## Choices" : "",
		...spec.choices.map((choice) => `- **${choice.name}**: ${choice.picked}`),
		"## Checks",
		...spec.checks.map((check) => `- ${check}`),
	]
		.filter((line) => line !== "")
		.join("\n");
}
