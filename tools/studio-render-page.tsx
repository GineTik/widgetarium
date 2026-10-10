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
import { NO_ASSISTANT } from "../packages/core/src/engine/assistant-port.js";
import type {
	AssistantPort,
	AssistantSession,
	AssistantSetup,
	AssistantTurn,
} from "../packages/core/src/engine/assistant-port.js";
import type { ChatCards } from "../packages/core/src/engine/assistant-cards.js";
import { JobSchema } from "../packages/core/src/app-jobs.js";
import { corePack } from "../packages/packs/core/src/index.js";
import { createMemoryRouter } from "../packages/core/src/app/memory-router.js";
import { WidgetariumApp, startProject } from "../packages/core/src/app/widgetarium-app.js";
import type { WidgetariumProject } from "../packages/core/src/app/widgetarium-project.js";
import {
	WidgetariumStudio,
	startOpenedStudio,
	startStudio,
} from "../packages/widgetarium/src/studio/widgetarium-studio.js";
import type { StartedStudio, StudioStart } from "../packages/widgetarium/src/studio/widgetarium-studio.js";
import { STUDIO_PACKS } from "../packages/widgetarium/src/studio/logic/studio-pack.js";
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
	packs: [corePack],
};

const MAC_INSETS = { left: 76, right: 0 };

const MEMORY_PARAMS_KEY = "Apps/Farm.md";

const FAKE_SETUP: AssistantSetup = {
	isReady: true,
	providerLabel: "Fake provider",
	providers: [{ id: "fake", label: "Fake provider", canEdit: true }],
	chosen: "fake",
	helperAgents: false,
	note: null,
	renderMarkdown: null,
};

const FAKE_ANSWER = "Planting them now.";
const REFUSED_WORD = "Break";
const REFUSED_SEND = "the fake provider refuses";
const SETUP_GONE = "the fake vault is gone";
const FARM_JOBS = [
	{
		app: "Farm",
		jobs: [
			JobSchema.parse({
				id: "rows-design",
				app: "Farm",
				title: "Design Rows",
				says: "x",
				phase: "design",
				status: "running",
			}),
		],
	},
];
const FAKE_SPEC = `---
app: Farm
job: Grow what the season allows.
features:
  - title: Plant a row
    says: Name the crop and the row
    actions: [create]
research:
  - product: Notion
    takes: Rows in a table
    url: https://www.notion.so
records:
  - name: Row
    can: [create]
pages:
  - name: Rows
    body: list-detail
    says: The rows and the open one
checks:
  - A planted row is in the list
---
`;

function fakeCardsOf(session: AssistantSession): ChatCards {
	return {
		ofTurns: session.turns.map((turn) => ({
			build: null,
			specApp: turn.role === "agent" ? "Farm" : null,
			designApp: null,
		})),
		pinned: null,
	};
}

function fakeAssistant(): AssistantPort {
	const watchers = new Set<() => void>();
	const sent: string[] = [];
	const built: string[] = [];
	const setupWatchers = new Set<() => void>();
	const setupRead = { fails: false };
	let session: AssistantSession = NO_ASSISTANT.session();
	const failSetup = (): void => {
		setupRead.fails = true;
		for (const changed of setupWatchers) changed();
	};
	Object.assign(window, { __SENT__: sent, __BUILT__: built, __FAIL_SETUP__: failSetup });
	return {
		...NO_ASSISTANT,
		can: true,
		session: () => session,
		onSession: (changed) => {
			watchers.add(changed);
			return () => void watchers.delete(changed);
		},
		setup: async () => {
			if (setupRead.fails) throw new Error(SETUP_GONE);
			return FAKE_SETUP;
		},
		onSetup: (changed) => {
			setupWatchers.add(changed);
			return () => void setupWatchers.delete(changed);
		},
		jobs: () => FARM_JOBS,
		cardsOf: fakeCardsOf,
		readAppFile: async () => FAKE_SPEC,
		buildIt: async (app) => void built.push(app),
		send: async (said) => {
			if (said.startsWith(REFUSED_WORD)) throw new Error(REFUSED_SEND);
			sent.push(said);
			const asked: AssistantTurn = { role: "user", text: said, calls: [] };
			const answered: AssistantTurn = { role: "agent", text: FAKE_ANSWER, calls: [] };
			session = { ...session, turns: [...session.turns, asked, answered] };
			for (const changed of watchers) changed();
		},
	};
}

function studioStartOf(mode: unknown): StudioStart {
	if (mode === "studio-mac") return { studio: { ...NO_STUDIO_HOST, insets: () => MAC_INSETS } };
	return { assistant: fakeAssistant() };
}

function studioOverOpenedProject(): StartedStudio {
	registerPacks(corePack, projectPackOf(PROJECT.handlers), ...STUDIO_PACKS);
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
	const started = mode === "studio-memory" ? studioOverOpenedProject() : startStudio(PROJECT, studioStartOf(mode));
	Object.assign(window, { __CATALOGUE__: started.catalogue });
	return started;
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
