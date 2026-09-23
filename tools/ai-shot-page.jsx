import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { AiChat } from "../apps/obsidian/src/ai/chat.js";
import { buildWidget } from "../packages/core/src/registry.js";
import taskProgressSource from "../registry/@default/task-progress/widget.tsx";
import taskProgressCard from "../registry/@default/task-progress/manifest.generated.json";

const PROVIDERS = [
	{ id: "claude-code", label: "Claude Code", canEdit: true },
	{ id: "opencode", label: "OpenCode", canEdit: true },
	{ id: "ollama", label: "Ollama", canEdit: false },
];

const AI = {
	chosen: "claude-code",
	provider: PROVIDERS[0],
	providers: PROVIDERS,
	ready: true,
	reason: null,
	skipPermissions: true,
	publishWidgets: true,
	note: { path: "Boards/Dashboard.md", hasBoard: true },
};

function sessionOf(state) {
	return {
		now: () => state,
		watch: () => () => {},
		send: () => {},
		stop: () => {},
		clear: () => {},
		retry: () => {},
	};
}

const EMPTY = { turns: [], busy: false, failure: null, session: null, tool: null };

const TALKING = {
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
				},
				{
					ref: "t2",
					name: "Bash",
					input: { command: "node /Users/me/Vault/.widgetarium/bin/widgets.mjs list --search kanban" },
					answered: true,
					output: "3 widgets",
					failed: false,
				},
				{
					ref: "t3",
					name: "Bash",
					input: { command: "npm run build 2>&1 | tail", description: "Rebuild the plugin and read the tail" },
					answered: true,
					output: "Exit code 127\n(eval):1: command not found",
					failed: true,
				},
				{
					ref: "t4",
					name: "Edit",
					input: { file_path: "Boards/Dashboard.md" },
					answered: true,
					output: "written",
					failed: false,
				},
				{
					ref: "t5",
					name: "Bash",
					input: { command: "node .widgetarium/bin/widgets.mjs layout Boards/Dashboard.md" },
					answered: true,
					output: "main[1] 1384px",
					failed: false,
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

const BROKEN = {
	turns: [
		{ role: "user", text: "Add a chart of my weight over the last month.", calls: [] },
		{ role: "agent", text: "", calls: [] },
	],
	busy: false,
	failure: "claude is waiting for an answer it can only be given in a terminal — it is most likely not signed in.",
	session: null,
	tool: null,
};

const TOOL = "node /Users/me/Vault/.widgetarium/bin/widgets.mjs";
const WIDGET_FOLDER = "/Users/me/Vault/.widgetarium/widgets/@mine";
const STARTED = Date.now() - 41000;

const buildCalls = (id, title, from) => [
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

const BUILDING = {
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

const BUILT = { ...BUILDING, busy: false, tool: null, phase: null };

const STATES = { empty: EMPTY, talking: TALKING, broken: BROKEN, building: BUILDING, built: BUILT };

const PROGRESS = {
	definition: {
		manifest: taskProgressCard,
		component: buildWidget({ manifest: taskProgressCard, code: taskProgressSource, path: "widget.tsx" }),
	},
	refusal: null,
};

const host = document.getElementById("host");
const which = document.body.dataset.state ?? "empty";
const holder = document.createElement("div");
holder.className = "wg-ai-shot";
host.appendChild(holder);
createRoot(holder).render(
	h(AiChat, {
		session: sessionOf(STATES[which]),
		ai: { ...AI, progress: PROGRESS },
		onChoose: () => {},
		onOpenProviders: () => {},
	}),
);
