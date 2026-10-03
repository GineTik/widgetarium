import { ICommand, IQuery, createWidget, defineLayout, defineMetadata, useData, z } from "widgetarium";
import { TemplateCard } from "./template-card";
import { TemplateSchema } from "./types";

const SHOWN_AT_MOST = 24;

const NOTHING = "No template answers to that.";

const TemplateList = createWidget({
	inject: {
		getTemplates: IQuery.expects(z.array(TemplateSchema).default([])),
		useTemplate: ICommand.sends(z.object({ template: z.string() })),
	},
	draw: ({ getTemplates, useTemplate }) => {
		const listed = useData(getTemplates, { offset: 0, limit: SHOWN_AT_MOST });
		if (!listed.isLoading && listed.data.length === 0) return <p className="wg-catalogue-tpl-none">{NOTHING}</p>;
		return (
			<div className="wg-catalogue-tpls">
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
		useTemplate: {
			label: "Create a page",
			source: { implementation: "@catalogue/use-template", fields: {} },
		},
	},
});

export const layout = defineLayout({ role: "collection", size: { preferredWidth: "full", preferredHeight: "auto" } });

export default TemplateList;
