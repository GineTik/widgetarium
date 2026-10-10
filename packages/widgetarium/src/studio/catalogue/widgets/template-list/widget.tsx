import { createElement as h } from "react";
import { ICommand, IQuery } from "@widgetarium/core/gateway/queries.js";
import { createWidget } from "@widgetarium/core/widget-api.js";
import { defineLayout, defineMetadata } from "@widgetarium/core/gateway/declared.js";
import { useData } from "@widgetarium/core/gateway/use-data.js";
import { z } from "zod";
import { TemplateCard } from "./template-card.js";
import { TemplateSchema } from "./types.js";

const SHOWN_AT_MOST = 24;

const NO_TEMPLATE_MATCHES = "No template answers to that.";

const TemplateList = createWidget({
	inject: {
		getTemplates: IQuery.output(z.array(TemplateSchema).default([])),
		getNoneSaid: IQuery.output(z.string().default(NO_TEMPLATE_MATCHES)),
		useTemplate: ICommand.input(z.object({ template: z.string() })),
	},
	draw: ({ getTemplates, getNoneSaid: noneSaid, useTemplate }) => {
		const listed = useData(getTemplates, { offset: 0, limit: SHOWN_AT_MOST });
		if (!listed.isLoading && listed.data.length === 0)
			return <p className="wg-studio-catalogue-tpl-none">{noneSaid}</p>;
		return (
			<div className="wg-studio-catalogue-tpls">
				{listed.data.map((template) => (
					<TemplateCard key={template.ref} template={template} create={useTemplate} />
				))}
			</div>
		);
	},
});

export const metadata = defineMetadata(TemplateList, {
	title: "Template list",
	description: "Page templates with a sketch of each: press one to make a page from it.",
	keywords: ["templates", "pages", "catalogue", "screens", "start", "create"],
	preview: {
		size: { w: 4, h: 4 },
		props: {
			getTemplates: {
				rows: [
					{
						id: "task-board",
						title: "Task board",
						description: "A board picker, a filter and a view picker over a kanban board of your tasks.",
						widgets: ["@default/kanban-board"],
						sketch: [{ name: "main", rows: [[{ label: "Kanban board", grow: 1 }]] }],
					},
				],
			},
		},
	},
	props: {
		getTemplates: { aka: ["templates"], label: "Templates", hint: "The templates to show." },
		getNoneSaid: { label: "When none are shown", hint: "What the list says when it shows no template." },
		useTemplate: {
			label: "Create a page",
			source: { implementation: "@catalogue/use-template", fields: {} },
		},
	},
});

export const layout = defineLayout({ role: "collection", size: { preferredWidth: "full", preferredHeight: "auto" } });

export default TemplateList;
