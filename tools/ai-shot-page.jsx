import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { AiChat } from "../src/ai/chat.js";

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

const STATES = { empty: EMPTY, talking: TALKING, broken: BROKEN };

const host = document.getElementById("host");
const which = document.body.dataset.state ?? "empty";
const holder = document.createElement("div");
holder.className = "wg-ai-shot";
host.appendChild(holder);
createRoot(holder).render(
	h(AiChat, { session: sessionOf(STATES[which]), ai: AI, onChoose: () => {}, onOpenProviders: () => {} }),
);
