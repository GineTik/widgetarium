import { Platform } from "obsidian";
import { openDesign } from "../design-view.js";
import type { App } from "obsidian";
import { bindNote } from "../host.js";
import type { ObsidianHost } from "../host.js";
import { WIDGETS_DIR } from "@widgetarium/core/paths.js";
import { BLOCK_LANGUAGE, FENCE } from "@widgetarium/core/block-writer.js";
import type { WidgetLookup } from "@widgetarium/core/registry.js";
import { TASK_PROGRESS } from "@widgetarium/core/engine/assistant-cards.js";
import type { ProgressWidget } from "@widgetarium/core/engine/assistant-port.js";
import type { createWantedWidgets } from "@widgetarium/core/engine/widgets-wanted.js";
import { createAiSettings } from "./settings.js";
import type { AiSettings, AiState } from "./settings.js";
import { createRunner } from "./run.js";
import type { KillGroup, Spawn } from "./run.js";
import { createSession } from "./session.js";
import type { BriefNow, Session } from "./session.js";
import { briefFor, helpersFor, jobBriefFor } from "./brief.js";
import { createJobs } from "./job-runner.js";
import type { Jobs } from "./job-runner.js";
import { createJobFiles } from "./job-store.js";
import type { BriefNote } from "./brief.js";
import { openProviderWindow } from "./provider-window.js";
import { HANDBOOK_DIR, TOOL_PATH } from "./agent-files.js";
import { whereCommandIs } from "./path.js";
import type { Environment } from "./path.js";
import { HTTP } from "./providers.js";
import type { Provider } from "./providers.js";
import { createSpecPort } from "./spec-port.js";
import type { SpecPort } from "./spec-port.js";
import { reportsBasePath } from "../desktop-adapter.js";

type WantedWidgets = ReturnType<typeof createWantedWidgets>;

export interface AssistantPlugin {
	readonly host: ObsidianHost;
	readonly manifest: { readonly id: string };
	readonly registry?: WidgetLookup | null;
	readonly wanted?: WantedWidgets | null;
	loadData(): Promise<unknown>;
	saveData(next: unknown): Promise<void>;
	redrawAssistant?(): void;
}

export interface Readiness {
	readonly ready: boolean;
	readonly reason: string | null;
}

export interface OpenNote extends BriefNote {
	readonly path: string;
	readonly hasBoard: boolean;
}

export interface AssistantState extends AiState, Readiness {
	readonly note: OpenNote | null;
	readonly host: ObsidianHost;
}

export interface Assistant {
	readonly session: Session;
	readonly jobs: Jobs;
	readonly settings: AiSettings;
	readonly specs: SpecPort;
	state(): Promise<AssistantState>;
	progress(): ProgressWidget;
	openDesign(app: string): Promise<void>;
	restore(): Promise<void>;
	forgetContext(): Promise<void>;
	openProviders(): void;
	close(): void;
}

interface NodeDoors {
	readonly spawn: Spawn | null;
	readonly killGroup: KillGroup | null;
	readonly exists: ((at: string) => Promise<boolean>) | null;
	readonly env: Environment;
}

interface AgentPaths {
	readonly vaultPath: string;
	readonly pluginPath: string;
}

const NOT_INSTALLED = "{command} was not found on this machine.";
const NO_COMMAND = "This provider has no command yet.";
const READY: Readiness = { ready: true, reason: null };

export function createAssistant(app: App, plugin: AssistantPlugin): Assistant {
	const doors = nodeDoors();
	const vaultPath = basePathOf(app);
	const paths: AgentPaths = {
		vaultPath,
		pluginPath: `${vaultPath}/${app.vault.configDir}/plugins/${plugin.manifest.id}`,
	};

	const settings = createAiSettings({
		read: () => plugin.loadData(),
		write: (next) => plugin.saveData(next),
	});

	const runner = createRunner({
		spawn: doors.spawn,
		killGroup: doors.killGroup,
		fetchStream: (url, init) => fetch(url, init),
		vaultPath,
		pluginPath: paths.pluginPath,
		env: doors.env,
	});

	const chat = createSession({ settings, runner, briefNow: () => briefNow(app, settings, paths) });
	const jobs = createJobs({
		files: createJobFiles(app.vault.adapter),
		runner,
		settings,
		briefOf: async (job) => jobBriefFor(briefPathsOf(paths), job, (await settings.state()).publishWidgets),
		tell: orchestratorTeller(chat),
		now: () => Date.now(),
	});
	const session: Session = {
		...chat,
		stop() {
			chat.stop();
			void jobs.stopAll();
		},
	};
	const hostFor = hostBinderFor(plugin);

	async function state(): Promise<AssistantState> {
		const held = await settings.state();
		const note = await noteNow(app);
		return {
			...held,
			...(await readinessOf(held.provider, doors)),
			note,
			host: hostFor(note?.path ?? ""),
		};
	}

	const providerWindow = providerWindowOpener({ plugin, settings, state });

	return {
		session,
		jobs,
		settings,
		specs: createSpecPort(app),
		state,
		progress: () => progressWidgetOf(plugin),
		openDesign: (name) => openDesign(app, name),
		restore: () => session.restore(),
		forgetContext: () => session.clear(),
		openProviders: providerWindow.open,
		close() {
			chat.stop();
			jobs.close();
			providerWindow.close();
		},
	};
}

interface ProviderWindowAsk {
	readonly plugin: AssistantPlugin;
	readonly settings: AiSettings;
	readonly state: () => Promise<AssistantState>;
}

function providerWindowOpener({ plugin, settings, state }: ProviderWindowAsk): { open(): void; close(): void } {
	let closeWindow: (() => void) | null = null;
	return {
		open() {
			closeWindow?.();
			closeWindow = openProviderWindow({
				read: state,
				onChoose: (id) => settings.choose(id),
				onUpdate: (id, patch) => settings.update(id, patch),
				onReset: (id) => settings.reset(id),
				onSkipPermissions: (on) => settings.setSkipPermissions(on),
				onPublishWidgets: (on) => settings.setPublishWidgets(on),
				onClose: () => {
					closeWindow = null;
					plugin.redrawAssistant?.();
				},
			});
		},
		close() {
			closeWindow?.();
			closeWindow = null;
		},
	};
}

function nodeDoors(): NodeDoors {
	if (!Platform.isDesktopApp || typeof require !== "function")
		return { spawn: null, killGroup: null, exists: null, env: {} };
	const { spawn }: typeof import("node:child_process") = require("node:child_process");
	const fs: typeof import("node:fs/promises") = require("node:fs/promises");
	return {
		spawn,
		killGroup: (group, signal) => process.kill(group, signal),
		exists: (at) =>
			fs.access(at).then(
				() => true,
				() => false,
			),
		env: process.env,
	};
}

function basePathOf(app: App): string {
	const { adapter } = app.vault;
	return reportsBasePath(adapter) ? adapter.getBasePath() : "";
}

async function noteNow(app: App): Promise<OpenNote | null> {
	const file = app.workspace.getActiveFile();
	if (!file) return null;
	const text = await app.vault.cachedRead(file);
	return { path: file.path, hasBoard: text.includes(`${FENCE}${BLOCK_LANGUAGE}`) };
}

function briefPathsOf({ vaultPath, pluginPath }: AgentPaths): Readonly<Record<string, string>> {
	return {
		vault: vaultPath,
		plugin: pluginPath,
		widgets: `${vaultPath}/${WIDGETS_DIR}`,
		handbook: `${vaultPath}/${HANDBOOK_DIR}`,
		tool: `${vaultPath}/${TOOL_PATH}`,
	};
}

function orchestratorTeller(chat: Session): (app: string, said: string) => void {
	const waiting: string[] = [];
	const sendNext = (): void => {
		const next = waiting[0];
		if (next === undefined || chat.now().busy) return;
		waiting.shift();
		void chat.send(next);
	};
	chat.watch(() => sendNext());
	return (_app, said) => {
		if (!waiting.includes(said)) waiting.push(said);
		sendNext();
	};
}

async function briefNow(app: App, settings: AiSettings, agentPaths: AgentPaths): Promise<BriefNow> {
	const held = await settings.state();
	const paths = briefPathsOf(agentPaths);
	const canEdit = held.provider.canEdit !== false;
	const helpers = canEdit && held.helperAgents;
	const brief = briefFor({ paths, note: await noteNow(app), publishWidgets: held.publishWidgets, canEdit, helpers });
	return { brief, helpers: helpers ? helpersFor(paths) : null };
}

function hostBinderFor(plugin: AssistantPlugin): (notePath: string) => ObsidianHost {
	let boundTo: string | null = null;
	let boundHost = plugin.host;
	return (notePath) => {
		if (boundTo === notePath) return boundHost;
		boundTo = notePath;
		boundHost = notePath ? bindNote(plugin.host, notePath) : plugin.host;
		return boundHost;
	};
}

async function readinessOf(provider: Provider, doors: NodeDoors): Promise<Readiness> {
	if (provider.kind === HTTP) return READY;
	if (String(provider.command ?? "").trim() === "") return { ready: false, reason: NO_COMMAND };
	const notHere = { ready: false, reason: NOT_INSTALLED.replace("{command}", provider.command) };
	if (!doors.exists) return notHere;
	return (await whereCommandIs(provider.command, { exists: doors.exists, env: doors.env })) ? READY : notHere;
}

function progressWidgetOf(plugin: AssistantPlugin): ProgressWidget {
	const definition = plugin.registry?.get(TASK_PROGRESS) ?? null;
	if (definition) return { definition, refusal: null };
	plugin.wanted
		?.want([TASK_PROGRESS])
		.then((fetched) => {
			if (fetched.length > 0) plugin.redrawAssistant?.();
		})
		.catch((failure: unknown) => console.error(`[widgetarium] ${TASK_PROGRESS} could not be fetched`, failure));
	return { definition: null, refusal: plugin.wanted?.refusalOf(TASK_PROGRESS) ?? null };
}
