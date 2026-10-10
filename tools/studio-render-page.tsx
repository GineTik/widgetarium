import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import type { Page, PageInput } from "../packages/core/src/gateway/page.js";
import { PageInputSchema, PageOf } from "../packages/core/src/gateway/page.js";
import { IQuery } from "../packages/core/src/gateway/queries.js";
import { ModuleRegistry } from "../packages/core/src/engine/module-registry.js";
import { registerPacks } from "../packages/core/src/engine/packs.js";
import { pageParamCell } from "../packages/core/src/engine/page-params.js";
import { projectPackOf } from "../packages/core/src/engine/project-pack.js";
import { NO_STUDIO_HOST } from "../packages/core/src/engine/studio-host.js";
import { corePack } from "../packages/packs/core/src/index.js";
import { createMemoryRouter } from "../packages/widgetarium/src/app/memory-router.js";
import { WidgetariumApp, startProject } from "../packages/widgetarium/src/app/widgetarium-app.js";
import type { WidgetariumProject } from "../packages/widgetarium/src/app/widgetarium-project.js";
import {
	WidgetariumStudio,
	startOpenedStudio,
	startStudio,
} from "../packages/widgetarium/src/studio/widgetarium-studio.js";
import type { StartedStudio, StudioStart } from "../packages/widgetarium/src/studio/widgetarium-studio.js";
import { studioPack } from "../packages/widgetarium/src/studio/logic/studio-pack.js";
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
		{ path: "/done/:id", params: ["id"], board: { v: 2, tiles: [], layout: { dir: "column", of: [] } } },
	],
	widgets: { "task-list": taskList },
	handlers: { TasksQuery },
};

const MAC_INSETS = { left: 76, right: 0 };

const MEMORY_PARAMS_KEY = "Apps/Farm.md";

const studioStartOf = (mode: unknown): StudioStart =>
	mode === "studio-mac" ? { studio: { ...NO_STUDIO_HOST, insets: () => MAC_INSETS } } : {};

function studioOverOpenedProject(): StartedStudio {
	registerPacks(corePack, projectPackOf(PROJECT.handlers), studioPack);
	const router = createMemoryRouter(() => PROJECT.routes, {
		at: "/",
		paramsKeyOf: (pathname) => `${MEMORY_PARAMS_KEY}${pathname}`,
	});
	Object.assign(window, {
		__ROUTER__: router,
		__PARAM__: (key: string) => pageParamCell(router.paramsKeyOf(router.pathname()), key).get(),
	});
	const opened = { app: PROJECT.app, routes: PROJECT.routes, registry: new ModuleRegistry(PROJECT.widgets) };
	return startOpenedStudio(opened, { router, studio: NO_STUDIO_HOST, appId: "Apps/Farm" });
}

function startedStudioOf(mode: unknown): StartedStudio {
	return mode === "studio-memory" ? studioOverOpenedProject() : startStudio(PROJECT, studioStartOf(mode));
}

const mode = pageGlobal("__MODE__");
const root = document.getElementById("root");
if (root === null) throw new Error("the page holds no #root");

try {
	const drawn =
		mode === "app"
			? h(WidgetariumApp, { project: startProject(PROJECT) })
			: h(WidgetariumStudio, { started: startedStudioOf(mode) });
	createRoot(root).render(drawn);
} catch (failure: unknown) {
	boom(`render: ${stackOf(failure)}`);
}
