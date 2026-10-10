import type { Job } from "../app-jobs.js";
import type { WidgetDefinition } from "../registry.js";
import { NO_CHAT_CARDS } from "./assistant-cards.js";
import type { ChatCards } from "./assistant-cards.js";

export type AssistantPhase = "thinking" | "tools" | "writing";

export interface AssistantCall {
	readonly ref: string;
	readonly name: string;
	readonly input: Readonly<Record<string, unknown>>;
	readonly output: string;
	readonly answered: boolean;
	readonly failed: boolean;
	readonly at: number;
	readonly answeredAt?: number;
}

export interface AssistantTurn {
	readonly role: "user" | "agent";
	readonly text: string;
	readonly calls: AssistantCall[];
}

export interface AssistantSession {
	readonly turns: readonly AssistantTurn[];
	readonly busy: boolean;
	readonly failure: string | null;
	readonly tool: string | null;
	readonly phase: AssistantPhase | null;
	readonly spent: number;
	readonly startedAt: number;
}

export interface CallFace {
	readonly glyph: string;
	readonly title: string;
	readonly hint: string;
}

export interface AssistantProvider {
	readonly id: string;
	readonly label: string;
	readonly canEdit: boolean;
}

export interface AssistantNote {
	readonly path: string;
	readonly hasBoard: boolean;
}

export type RenderMarkdown = (element: HTMLElement, markdown: string) => () => void;

export interface AssistantSetup {
	readonly isReady: boolean;
	readonly providerLabel: string;
	readonly providers: readonly AssistantProvider[];
	readonly chosen: string;
	readonly helperAgents: boolean;
	readonly note: AssistantNote | null;
	readonly renderMarkdown: RenderMarkdown | null;
}

export interface AppJobs {
	readonly app: string;
	readonly jobs: readonly Job[];
}

export interface ProgressWidget {
	readonly definition: WidgetDefinition | null;
	readonly refusal: string | null;
}

export interface AssistantPort {
	readonly can: boolean;
	session(): AssistantSession;
	onSession(changed: () => void): () => void;
	setup(): Promise<AssistantSetup>;
	onSetup(changed: () => void): () => void;
	send(said: string): Promise<void>;
	retry(): void;
	stop(): void;
	clear(): Promise<void>;
	chooseProvider(id: string): Promise<void>;
	setHelperAgents(on: boolean): Promise<void>;
	openProviders(): void;
	describeCall(call: AssistantCall): CallFace;
	cardsOf(session: AssistantSession): ChatCards;
	readAppFile(path: string): Promise<string | null>;
	onAppFile(path: string, changed: () => void): () => void;
	changeAppFile(path: string, edit: (text: string) => string): Promise<void>;
	jobs(): readonly AppJobs[];
	onJobs(changed: () => void): () => void;
	startJob(app: string, id: string): Promise<void>;
	stopJob(app: string, id: string): Promise<void>;
	buildIt(app: string): Promise<void>;
	approveDesign(app: string): Promise<void>;
	openDesign(app: string): Promise<void>;
	progressWidget(): ProgressWidget;
}

export const ASSISTANT_NOT_AVAILABLE = "AI is not available on this host";

const NO_SESSION: AssistantSession = {
	turns: [],
	busy: false,
	failure: null,
	tool: null,
	phase: null,
	spent: 0,
	startedAt: 0,
};

const NO_JOBS: readonly AppJobs[] = [];
const NO_PROGRESS: ProgressWidget = { definition: null, refusal: ASSISTANT_NOT_AVAILABLE };
const unwatched = (): (() => void) => () => undefined;

const refused = (): Promise<never> => Promise.reject(new Error(ASSISTANT_NOT_AVAILABLE));

export const NO_ASSISTANT: AssistantPort = {
	can: false,
	session: () => NO_SESSION,
	onSession: unwatched,
	setup: refused,
	onSetup: unwatched,
	send: refused,
	retry: () => undefined,
	stop: () => undefined,
	clear: refused,
	chooseProvider: refused,
	setHelperAgents: refused,
	openProviders: () => undefined,
	describeCall: (call) => ({ glyph: "widget", title: call.name, hint: "" }),
	cardsOf: () => NO_CHAT_CARDS,
	readAppFile: async () => null,
	onAppFile: unwatched,
	changeAppFile: refused,
	jobs: () => NO_JOBS,
	onJobs: unwatched,
	startJob: refused,
	stopJob: refused,
	buildIt: refused,
	approveDesign: refused,
	openDesign: refused,
	progressWidget: () => NO_PROGRESS,
};
