import type { ObsidianAssistantPort, SetupSource } from "../apps/obsidian/src/ai/assistant-port-obsidian.ts";
import { PROGRESS, checkCardDoors, fakeJobs, fakeSpecs } from "./obsidian-assistant-card-checks.ts";
import type { FakeJobs } from "./obsidian-assistant-card-checks.ts";
import { assistantSetupOf, obsidianAssistantPort } from "../apps/obsidian/src/ai/assistant-port-obsidian.ts";
import { PRESETS } from "../apps/obsidian/src/ai/providers.ts";
import type { Provider } from "../apps/obsidian/src/ai/providers.ts";
import type { Session, SessionState } from "../apps/obsidian/src/ai/session.ts";
import type { AiState } from "../apps/obsidian/src/ai/settings.ts";
import { standIn } from "./stand-in.ts";

export interface CheckedAssistant {
	readonly port: ObsidianAssistantPort;
	readonly providerLabel: string;
	readonly asked: string;
}

type Check = (what: string, held: unknown, wanted: unknown) => void;

interface FakeAssistant {
	readonly port: ObsidianAssistantPort;
	readonly session: Session;
	readonly jobs: FakeJobs;
	readonly asked: string[];
	readonly source: SetupSource;
	readonly first: Provider;
	readonly second: Provider;
}

const ASKED = "Build a farm";
const NO_TURNS: SessionState = {
	turns: [],
	busy: false,
	failure: null,
	session: null,
	tool: null,
	phase: null,
	spent: 0,
	startedAt: 0,
};

export async function checkedAssistantPort(check: Check): Promise<CheckedAssistant> {
	const fake = fakeAssistant();
	await checkSessionDoors(check, fake);
	await checkSetupDoors(check, fake);
	await checkSetupShape(check, fake);
	checkCallFace(check, fake.port);
	await checkCardDoors(check, fake);
	return { port: fake.port, providerLabel: fake.first.label, asked: ASKED };
}

function fakeAssistant(): FakeAssistant {
	const asked: string[] = [];
	const [first, second] = PRESETS;
	if (!first || !second) throw new Error("the presets hold fewer than two providers");
	const source: SetupSource = {
		ready: true,
		provider: first,
		providers: [first, second],
		chosen: first.id,
		helperAgents: false,
		note: { path: "Apps/Farm.md", hasBoard: true },
		host: { can: { renderMarkdown: true }, ui: { renderMarkdown: renderMarkdownNowhere } },
	};
	const settingAsked = (said: string): Promise<AiState> => {
		asked.push(said);
		return Promise.resolve(standIn<AiState>({}, [], "ai state"));
	};
	const session = fakeSession(asked);
	const jobs = fakeJobs(asked);
	const port = obsidianAssistantPort({
		session,
		settings: {
			choose: (id) => settingAsked(`choose ${id}`),
			setHelperAgents: (on) => settingAsked(`helpers ${String(on)}`),
		},
		jobs,
		specs: fakeSpecs(asked),
		state: async () => source,
		progress: () => PROGRESS,
		openProviders: () => void asked.push("providers"),
		openDesign: async (app) => void asked.push(`design ${app}`),
	});
	return { port, session, jobs, asked, source, first, second };
}

function fakeSession(asked: string[]): Session {
	const watchers = new Set<() => void>();
	let now = NO_TURNS;
	return {
		now: () => now,
		restore: async () => undefined,
		watch: (watcher) => {
			const changed = (): void => watcher(now);
			watchers.add(changed);
			return () => watchers.delete(changed);
		},
		send: async (said) => {
			asked.push(`send ${String(said)}`);
			now = { ...now, turns: [...now.turns, { role: "user", text: String(said), calls: [] }] };
			for (const changed of watchers) changed();
		},
		retry: () => void asked.push("retry"),
		stop: () => void asked.push("stop"),
		clear: async () => void asked.push("clear"),
	};
}

async function checkSessionDoors(check: Check, { port, session, asked }: FakeAssistant): Promise<void> {
	check("the port reads the very session the assistant view reads", port.session() === session.now(), true);
	let sessionSeen = 0;
	const stopSession = port.onSession(() => (sessionSeen += 1));
	await port.send(ASKED);
	stopSession();
	port.stop();
	port.retry();
	await port.clear();
	port.openProviders();
	check(
		"a send through the port lands in the session and its watchers hear it",
		[port.session().turns.map((turn) => turn.text), sessionSeen],
		[[ASKED], 1],
	);
	check("stop, retry, clear and the providers window reach the assistant", asked.splice(0), [
		`send ${ASKED}`,
		"stop",
		"retry",
		"clear",
		"providers",
	]);
}

async function checkSetupDoors(check: Check, { port, asked, second }: FakeAssistant): Promise<void> {
	let setupSeen = 0;
	const stopSetup = port.onSetup(() => (setupSeen += 1));
	await port.chooseProvider(second.id);
	await port.setHelperAgents(true);
	port.setupChanged();
	stopSetup();
	port.setupChanged();
	check(
		"a provider pick and a helper switch write the settings, and every setup change is heard until unwatched",
		[asked.splice(0), setupSeen],
		[[`choose ${second.id}`, "helpers true"], 3],
	);
}

async function checkSetupShape(check: Check, { port, source, first }: FakeAssistant): Promise<void> {
	const setup = await port.setup();
	check(
		"the setup carries the provider, the choices, the note and the host's markdown",
		[
			setup.isReady,
			setup.providerLabel,
			setup.providers.map((provider) => Object.keys(provider)),
			setup.chosen,
			setup.note,
			setup.renderMarkdown === renderMarkdownNowhere,
		],
		[
			true,
			first.label,
			[
				["id", "label", "canEdit"],
				["id", "label", "canEdit"],
			],
			first.id,
			{ path: "Apps/Farm.md", hasBoard: true },
			true,
		],
	);
	const plainHost = { can: { renderMarkdown: false }, ui: { renderMarkdown: renderMarkdownNowhere } };
	check(
		"a host that cannot render markdown hands the chat plain text",
		assistantSetupOf({ ...source, host: plainHost }).renderMarkdown,
		null,
	);
}

function checkCallFace(check: Check, port: ObsidianAssistantPort): void {
	check(
		"a call to the widgets tool is named as ours",
		port.describeCall({
			ref: "c1",
			name: "Bash",
			input: { command: "node .widgetarium/bin/widgets.mjs find kanban" },
			output: "",
			answered: true,
			failed: false,
			at: 0,
		}),
		{ glyph: "widget", title: "Widgetarium · find", hint: "kanban" },
	);
}

function renderMarkdownNowhere(): () => void {
	return () => undefined;
}
