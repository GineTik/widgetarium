import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import type { Page, PageInput } from "../packages/core/src/gateway/page.js";
import { PageInputSchema, PageOf } from "../packages/core/src/gateway/page.js";
import { IQuery } from "../packages/core/src/gateway/queries.js";
import { NO_STUDIO_HOST } from "../packages/core/src/engine/studio-host.js";
import type { StudioHostPort } from "../packages/core/src/engine/studio-host.js";
import { WidgetariumApp, startProject } from "../packages/widgetarium/src/app/widgetarium-app.js";
import type { WidgetariumProject } from "../packages/widgetarium/src/app/widgetarium-project.js";
import { WidgetariumStudio, startStudio } from "../packages/widgetarium/src/studio/widgetarium-studio.js";
import * as taskList from "./studio-fixture-widget.tsx";
import { FixtureTaskSchema } from "./studio-fixture-widget.tsx";
import { boom, pageGlobal, reportsFailures, stackOf } from "./page-harness.ts";

reportsFailures();

type FixtureTask = { readonly id: string; readonly title: string };

const TASKS: readonly FixtureTask[] = [
	{ id: "t1", title: "Water the ferns" },
	{ id: "t2", title: "Mend the fence" },
];

class TasksQuery extends IQuery.input(PageInputSchema).output(PageOf(FixtureTaskSchema)) {
	override async query(_input: PageInput): Promise<Page<FixtureTask>> {
		return { items: [...TASKS], next: null, total: TASKS.length };
	}
}

const PROJECT: WidgetariumProject = {
	app: { name: "Farm", iconHref: "" },
	routes: [
		{
			path: "/",
			params: [],
			board: {
				v: 2,
				tiles: [
					{
						id: "tasks",
						widget: "task-list",
						props: { getTasks: { implementation: "TasksQuery", fields: {}, allow: ["query"] } },
					},
				],
				layout: { dir: "column", of: [{ id: "tasks" }] },
			},
		},
	],
	widgets: { "task-list": taskList },
	handlers: { TasksQuery },
};

const MAC_INSETS = { left: 76, right: 0 };

const studioHostOf = (mode: unknown): StudioHostPort | undefined =>
	mode === "studio-mac" ? { ...NO_STUDIO_HOST, insets: () => MAC_INSETS } : undefined;

const mode = pageGlobal("__MODE__");
const root = document.getElementById("root");
if (root === null) throw new Error("the page holds no #root");

try {
	const drawn =
		mode === "app"
			? h(WidgetariumApp, { project: startProject(PROJECT) })
			: h(WidgetariumStudio, { started: startStudio(PROJECT, studioHostOf(mode)) });
	createRoot(root).render(drawn);
} catch (failure: unknown) {
	boom(`render: ${stackOf(failure)}`);
}
