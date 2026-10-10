import type {
	AppJobs,
	AssistantCall,
	AssistantPort,
	AssistantSession,
	AssistantSetup,
	CallFace,
	ProgressWidget,
	RenderMarkdown,
} from "@widgetarium/core/engine/assistant-port.js";
import type { ChatCards } from "@widgetarium/core/engine/assistant-cards.js";
import type { AssistantState } from "./assistant.js";
import { APPROVE_DESIGN, BUILD_IT, chatCardsOf } from "./chat-cards.js";
import type { Jobs } from "./job-runner.js";
import type { Session } from "./session.js";
import type { AiSettings } from "./settings.js";
import { askedForApp } from "./spec-calls.js";
import type { SpecPort } from "./spec-port.js";
import { glyphOf, hintOf, titleOf } from "./tools.js";

export interface ObsidianAssistantPort extends AssistantPort {
	setupChanged(): void;
}

export interface MarkdownHost {
	readonly can?: { readonly renderMarkdown?: boolean } | null;
	readonly ui?: { readonly renderMarkdown?: RenderMarkdown } | null;
}

interface RenderingHost {
	readonly ui: { readonly renderMarkdown: RenderMarkdown };
}

export type SetupSource = Pick<
	AssistantState,
	"ready" | "provider" | "providers" | "chosen" | "helperAgents" | "note"
> & {
	readonly host: MarkdownHost | null;
};

export type JobsDoor = Pick<Jobs, "watch" | "version" | "apps" | "jobsOf" | "start" | "stop">;

export interface AssistantDoors {
	readonly session: Session;
	readonly settings: Pick<AiSettings, "choose" | "setHelperAgents">;
	readonly jobs: JobsDoor;
	readonly specs: SpecPort;
	state(): Promise<SetupSource>;
	progress(): ProgressWidget;
	openProviders(): void;
	openDesign(app: string): Promise<void>;
}

export function obsidianAssistantPort(assistant: AssistantDoors): ObsidianAssistantPort {
	const setupWatchers = new Set<() => void>();
	const setupChanged = (): void => {
		for (const changed of setupWatchers) changed();
	};
	const changingSetup = async (change: Promise<unknown>): Promise<void> => {
		await change;
		setupChanged();
	};
	const { session, specs, jobs } = assistant;
	return {
		can: true,
		session: () => session.now(),
		onSession: (changed) => session.watch(() => changed()),
		setup: async () => assistantSetupOf(await assistant.state()),
		onSetup: (changed) => {
			setupWatchers.add(changed);
			return () => void setupWatchers.delete(changed);
		},
		send: (said) => session.send(said),
		retry: () => session.retry(),
		stop: () => session.stop(),
		clear: () => session.clear(),
		chooseProvider: (id) => changingSetup(assistant.settings.choose(id)),
		setHelperAgents: (on) => changingSetup(assistant.settings.setHelperAgents(on)),
		openProviders: () => assistant.openProviders(),
		describeCall: callFaceOf,
		cardsOf: lastCardsReader(),
		readAppFile: (path) => specs.read(path),
		onAppFile: (path, changed) => specs.watch(path, changed),
		changeAppFile: (path, edit) => specs.change(path, edit),
		jobs: jobsReader(jobs),
		onJobs: (changed) => jobs.watch(changed),
		startJob: (app, id) => jobs.start(app, id),
		stopJob: (app, id) => jobs.stop(app, id),
		buildIt: (app) => session.send(askedForApp(BUILD_IT, app)),
		approveDesign: (app) => session.send(askedForApp(APPROVE_DESIGN, app)),
		openDesign: (app) => assistant.openDesign(app),
		progressWidget: () => assistant.progress(),
		setupChanged,
	};
}

export function assistantSetupOf(state: SetupSource): AssistantSetup {
	return {
		isReady: state.ready,
		providerLabel: state.provider.label,
		providers: state.providers.map(({ id, label, canEdit }) => ({ id, label, canEdit })),
		chosen: state.chosen,
		helperAgents: state.helperAgents,
		note: state.note ? { path: state.note.path, hasBoard: state.note.hasBoard } : null,
		renderMarkdown: canRenderMarkdown(state.host) ? state.host.ui.renderMarkdown : null,
	};
}

export function callFaceOf(call: AssistantCall): CallFace {
	return { glyph: glyphOf(call), title: titleOf(call), hint: hintOf(call) };
}

export function canRenderMarkdown(host: MarkdownHost | null | undefined): host is MarkdownHost & RenderingHost {
	return host?.can?.renderMarkdown === true && typeof host.ui?.renderMarkdown === "function";
}

function lastCardsReader(): (session: AssistantSession) => ChatCards {
	let held: { readonly session: AssistantSession; readonly cards: ChatCards } | null = null;
	return (session) => {
		if (held?.session !== session) held = { session, cards: chatCardsOf(session) };
		return held.cards;
	};
}

function jobsReader(jobs: JobsDoor): () => readonly AppJobs[] {
	let held: { readonly version: number; readonly apps: readonly AppJobs[] } | null = null;
	return () => {
		const version = jobs.version();
		if (held?.version !== version)
			held = { version, apps: jobs.apps().map((app) => ({ app, jobs: jobs.jobsOf(app) })) };
		return held.apps;
	};
}
