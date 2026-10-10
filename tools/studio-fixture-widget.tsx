import { createElement as h } from "react";
import { z } from "zod";
import { Card } from "@widgetarium/kit";
import { defineLayout, defineMetadata } from "../packages/core/src/gateway/declared.js";
import { PageInputSchema, PageOf } from "../packages/core/src/gateway/page.js";
import { IQuery } from "../packages/core/src/gateway/queries.js";
import { useData } from "../packages/core/src/gateway/use-data.js";
import { createWidget } from "../packages/core/src/widget-api.js";

export const FixtureTaskSchema = z.object({ id: z.string(), title: z.string() });

const TaskList = createWidget({
	inject: { getTasks: IQuery.input(PageInputSchema).output(PageOf(FixtureTaskSchema)) },
	draw: ({ getTasks }) => {
		const { data } = useData(getTasks, { limit: 20 });
		return (
			<Card>
				{data.map((task) => (
					<p key={task.id} data-task="">
						{task.title}
					</p>
				))}
			</Card>
		);
	},
});

export const metadata = defineMetadata(TaskList, {
	title: "Task list",
	description: "Which tasks are left to do?",
	keywords: ["tasks", "list"],
	props: { getTasks: { label: "Tasks" } },
});

export const layout = defineLayout({ role: "collection", size: { preferredWidth: 360, preferredHeight: "auto" } });

export default TaskList;
