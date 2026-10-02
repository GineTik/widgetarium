import "./packs-registered.ts";
import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { AiChat } from "../apps/obsidian/src/ai/chat.js";
import { DEFAULT_PRESET, PRESETS } from "../apps/obsidian/src/ai/providers.js";
import type { ProgressWidget } from "../apps/obsidian/src/ai/assistant.js";
import type { ObsidianHost } from "../apps/obsidian/src/host.js";
import { standIn } from "./stand-in.ts";
import type { Session, SessionState } from "../apps/obsidian/src/ai/session.js";
import type { KeptCall } from "../apps/obsidian/src/ai/transcript.js";
import { buildWidget } from "../packages/core/src/registry.js";
import taskProgressSource from "widget-source:@default/task-progress/widget.tsx";
import taskProgressCard from "../registry/@default/task-progress/manifest.generated.json";

const SHOWN_PROVIDERS = new Set(["claude-code", "opencode", "ollama"]);
const PROVIDERS = PRESETS.filter((provider) => SHOWN_PROVIDERS.has(provider.id));
const TASK_PROGRESS_ID = "@default/task-progress";

const AI = {
	chosen: "claude-code",
	provider: DEFAULT_PRESET,
	providers: PROVIDERS,
	ready: true,
	reason: null,
	skipPermissions: true,
	publishWidgets: true,
	note: { path: "Boards/Dashboard.md", hasBoard: true },
	host: standIn<ObsidianHost>({}, [], "ai shot host"),
};

function sessionOf(state: SessionState): Session {
	return {
		now: () => state,
		restore: async () => {},
		watch: () => () => {},
		send: async () => {},
		stop: () => {},
		clear: async () => {},
		retry: () => {},
	};
}

const QUIET = { phase: null, spent: 0, startedAt: 0 };

const EMPTY: SessionState = { turns: [], busy: false, failure: null, session: null, tool: null, ...QUIET };

const TALKING: SessionState = {
	turns: [
		{ role: "user", text: "Build me a morning board: today's tasks, a habit streak and a scratchpad.", calls: [] },
		{
			role: "agent",
			text: "Found three widgets. Placing the tab strip first.\n\nPlaced @default/editable-tabs at the top. Next: the task list.",
			calls: [
				{
					ref: "t1",
					name: "Read",
					input: { file_path: "Tasks/Today.md" },
					answered: true,
					output: "- [ ] ship the panel",
					failed: false,
					at: 0,
				},
				{
					ref: "t2",
					name: "Bash",
					input: { command: "node /Users/me/Vault/.widgetarium/bin/widgets.mjs list --search kanban" },
					answered: true,
					output: "3 widgets",
					failed: false,
					at: 0,
				},
				{
					ref: "t3",
					name: "Bash",
					input: { command: "npm run build 2>&1 | tail", description: "Rebuild the plugin and read the tail" },
					answered: true,
					output: "Exit code 127\n(eval):1: command not found",
					failed: true,
					at: 0,
				},
				{
					ref: "t4",
					name: "Edit",
					input: { file_path: "Boards/Dashboard.md" },
					answered: true,
					output: "written",
					failed: false,
					at: 0,
				},
				{
					ref: "t5",
					name: "Bash",
					input: { command: "node .widgetarium/bin/widgets.mjs layout Boards/Dashboard.md" },
					answered: true,
					output: "main[1] 1384px",
					failed: false,
					at: 0,
				},
			],
		},
	],
	busy: true,
	failure: null,
	session: "s-1",
	tool: "Edit",
	phase: "tools",
	spent: 1340,
	startedAt: Date.now() - 63000,
};

const BROKEN: SessionState = {
	turns: [
		{ role: "user", text: "Add a chart of my weight over the last month.", calls: [] },
		{ role: "agent", text: "", calls: [] },
	],
	busy: false,
	failure: "claude is waiting for an answer it can only be given in a terminal — it is most likely not signed in.",
	session: null,
	tool: null,
	...QUIET,
};

const TOOL = "node /Users/me/Vault/.widgetarium/bin/widgets.mjs";
const WIDGET_FOLDER = "/Users/me/Vault/.widgetarium/widgets/@mine";
const STARTED = Date.now() - 41000;

const buildCalls = (id: string, title: string, from: number): KeptCall[] => [
	{
		ref: `${id}-start`,
		name: "Bash",
		input: { command: `${TOOL} start @mine/${id} --title "${title}"` },
		answered: true,
		output: `Building @mine/${id}, a new widget.`,
		failed: false,
		at: from,
		answeredAt: from + 400,
	},
	{
		ref: `${id}-write`,
		name: "Write",
		input: { file_path: `${WIDGET_FOLDER}/${id}/widget.tsx` },
		answered: true,
		output: "written",
		failed: false,
		at: from + 9000,
		answeredAt: from + 9200,
	},
	{
		ref: `${id}-check`,
		name: "Bash",
		input: { command: `${TOOL} check @mine/${id}` },
		answered: true,
		output: "the widget is clean",
		failed: false,
		at: from + 21000,
		answeredAt: from + 22000,
	},
];

const MISSING_SAID =
	"The catalogue has nothing for two of these, so I will write them:\n\n- **Habit streak** — days in a row a habit was kept, with the gaps.\n- **Mood month** — one dot a day, coloured by mood.\n\nMoving on to create them.";

const BUILDING: SessionState = {
	turns: [
		{ role: "user", text: "Add a habit streak and a mood month to the right column.", calls: [] },
		{
			role: "agent",
			text: MISSING_SAID,
			calls: [
				...buildCalls("mood-month", "Mood month", STARTED - 60000),
				{
					ref: "mood-note",
					name: "Edit",
					input: { file_path: "/Users/me/Vault/Boards/Dashboard.md" },
					answered: true,
					output: "written",
					failed: false,
					at: STARTED - 20000,
					answeredAt: STARTED - 19800,
				},
				{
					ref: "mood-lint",
					name: "Bash",
					input: { command: `${TOOL} lint Boards/Dashboard.md` },
					answered: true,
					output: "the board is valid",
					failed: false,
					at: STARTED - 12000,
					answeredAt: STARTED - 11000,
				},
				...buildCalls("habit-streak", "Habit streak", STARTED),
			],
		},
	],
	busy: true,
	failure: null,
	session: "s-2",
	tool: "Bash",
	phase: "tools",
	spent: 2210,
	startedAt: STARTED - 70000,
};

const BUILT: SessionState = { ...BUILDING, busy: false, tool: null, phase: null };

const STATES: ReadonlyMap<string, SessionState> = new Map([
	["empty", EMPTY],
	["talking", TALKING],
	["broken", BROKEN],
	["building", BUILDING],
	["built", BUILT],
]);

const taskProgressManifest = { ...taskProgressCard, id: TASK_PROGRESS_ID };

const PROGRESS: ProgressWidget = {
	definition: {
		manifest: taskProgressManifest,
		component: buildWidget({ manifest: taskProgressManifest, code: taskProgressSource, path: "widget.tsx" }),
	},
	refusal: null,
};

const host = document.getElementById("host");
if (!host) throw new Error("ai shot: the page has no #host");
const which = document.body.dataset["state"] ?? "empty";
const holder = document.createElement("div");
holder.className = "wg-ai-shot";
host.appendChild(holder);
createRoot(holder).render(
	h(AiChat, {
		session: sessionOf(STATES.get(which) ?? EMPTY),
		ai: { ...AI, progress: PROGRESS },
		onChoose: () => {},
		onOpenProviders: () => {},
	}),
);
