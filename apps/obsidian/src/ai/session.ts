import { briefGoesInTheMessage, resumesWithoutAnId } from "./providers.js";
import { withResult } from "./tools.js";
import type { AiSettings, AiState } from "./settings.js";
import type { ChatTurn, Run, Runner, RunAsk } from "./run.js";
import type { Phase, StreamPart } from "./stream.js";
import type { KeptCall, KeptTurn } from "./transcript.js";

export interface SessionState {
	readonly turns: KeptTurn[];
	readonly busy: boolean;
	readonly failure: string | null;
	readonly session: string | null;
	readonly tool: string | null;
	readonly phase: Phase | null;
	readonly spent: number;
	readonly startedAt: number;
}

export type SessionWatcher = (state: SessionState) => void;

export interface SessionDoors {
	readonly settings: AiSettings;
	readonly runner: Runner;
	readonly briefNow: () => Promise<string>;
}

export interface Session {
	now(): SessionState;
	restore(): Promise<void>;
	watch(watcher: SessionWatcher): () => void;
	send(said: unknown): Promise<void>;
	retry(): void;
	stop(): void;
	clear(): Promise<void>;
}

const DRAW_EVERY_MS = 60;
const STOPPED = "Stopped.";
const RESUMES_ITS_OWN_LAST = "last";

export function createSession(doors: SessionDoors): Session {
	const store: SessionStore = { state: emptyState(), activeRun: null, drawTimer: null, watchers: new Set() };
	const send = (said: unknown): Promise<void> => sendThrough(doors, store, said);

	return {
		now: () => store.state,

		async restore() {
			if (store.state.turns.length > 0 || store.state.busy) return;
			const held = await doors.settings.remembered();
			if (held.turns.length === 0) return;
			patchState(store, { turns: held.turns, session: held.session });
			notifyWatchers(store);
		},

		watch(watcher) {
			store.watchers.add(watcher);
			return () => store.watchers.delete(watcher);
		},

		send,

		retry() {
			const { turns, busy } = store.state;
			const lastAsked = [...turns].reverse().find((turn) => turn.role === "user");
			if (!lastAsked || busy) return;
			patchState(store, { turns: turns.slice(0, turns.lastIndexOf(lastAsked)), failure: null });
			void send(lastAsked.text);
		},

		stop() {
			if (!store.activeRun) return;
			store.activeRun.stop();
			patchState(store, { failure: STOPPED });
			notifyWatchers(store);
		},

		clear() {
			store.activeRun?.stop();
			store.activeRun = null;
			store.state = emptyState();
			notifyWatchers(store);
			return keep(doors, store);
		},
	};
}

interface SessionStore {
	state: SessionState;
	activeRun: Run | null;
	drawTimer: ReturnType<typeof setTimeout> | null;
	readonly watchers: Set<SessionWatcher>;
}

function emptyState(): SessionState {
	return { turns: [], busy: false, failure: null, session: null, tool: null, phase: null, spent: 0, startedAt: 0 };
}

function notifyWatchers(store: SessionStore): void {
	for (const watch of store.watchers) watch(store.state);
}

function notifyWatchersSoon(store: SessionStore): void {
	if (store.drawTimer !== null) return;
	store.drawTimer = setTimeout(() => {
		store.drawTimer = null;
		notifyWatchers(store);
	}, DRAW_EVERY_MS);
}

function patchState(store: SessionStore, patch: Partial<SessionState>): void {
	store.state = { ...store.state, ...patch };
}

function intoLastTurn(store: SessionStore, step: (turn: KeptTurn) => KeptTurn): void {
	const turns = store.state.turns.slice();
	const last = turns[turns.length - 1];
	if (!last) return;
	turns[turns.length - 1] = step(last);
	patchState(store, { turns });
}

function keep({ settings }: SessionDoors, store: SessionStore): Promise<void> {
	return settings.remember({ turns: store.state.turns, session: store.state.session });
}

function historyForChat(state: SessionState): ChatTurn[] {
	return state.turns
		.filter((turn) => turn.text !== "")
		.map((turn) => ({ role: turn.role === "user" ? "user" : "assistant", text: turn.text }));
}

function applyEvent(store: SessionStore, event: StreamPart): void {
	if ("session" in event && event.session) patchState(store, { session: event.session });
	if ("phase" in event && event.phase)
		patchState(store, { phase: event.phase, ...(event.phase === "tools" ? {} : { tool: null }) });
	if ("spentMore" in event && Number.isFinite(event.spentMore))
		patchState(store, { spent: store.state.spent + event.spentMore });
	if ("spent" in event && Number.isFinite(event.spent)) patchState(store, { spent: event.spent });
	if ("call" in event && event.call) {
		const { call } = event;
		patchState(store, { tool: call.name, phase: "tools" });
		const fresh: KeptCall = { ...call, answered: false, output: "", failed: false, at: Date.now() };
		intoLastTurn(store, (turn) => ({ ...turn, calls: [...turn.calls, fresh] }));
	}
	if ("result" in event && event.result) {
		const { result } = event;
		intoLastTurn(store, (turn) => ({ ...turn, calls: withResult(turn.calls, { ...result, at: Date.now() }) }));
	}
	if ("text" in event && event.text) {
		const { text } = event;
		intoLastTurn(store, (turn) => ({ ...turn, text: turn.text + text }));
	}
	if ("failure" in event && event.failure) patchState(store, { failure: event.failure });
	notifyWatchersSoon(store);
}

function askOf(asked: string, history: ChatTurn[], held: AiState, brief: string, session: string | null): RunAsk {
	return {
		prompt: briefGoesInTheMessage(held.provider) ? `${brief}\n\n---\n\n${asked}` : asked,
		brief,
		history,
		session,
		skipPermissions: held.skipPermissions,
	};
}

function startTurn(store: SessionStore, asked: string): void {
	patchState(store, {
		turns: [...store.state.turns, { role: "user", text: asked, calls: [] }, { role: "agent", text: "", calls: [] }],
		busy: true,
		failure: null,
		tool: null,
		phase: "thinking",
		spent: 0,
		startedAt: Date.now(),
	});
	notifyWatchers(store);
}

async function sendThrough(doors: SessionDoors, store: SessionStore, said: unknown): Promise<void> {
	const asked = String(said ?? "").trim();
	if (asked === "" || store.state.busy) return;

	const history = historyForChat(store.state);
	startTurn(store, asked);
	const held = await doors.settings.state();
	const brief = await doors.briefNow();
	const { provider } = held;
	const ask = askOf(asked, history, held, brief, store.state.session);
	store.activeRun = doors.runner.run(provider, ask, (event) => applyEvent(store, event));
	const done = await store.activeRun.done;
	store.activeRun = null;
	if (store.drawTimer !== null) clearTimeout(store.drawTimer);
	store.drawTimer = null;
	// TRADE-OFF: a marker, because a CLI that resumes its own last conversation names no id to carry
	const carried =
		store.state.session ?? (done.failure === null && resumesWithoutAnId(provider) ? RESUMES_ITS_OWN_LAST : null);
	patchState(store, {
		busy: false,
		tool: null,
		phase: null,
		session: carried,
		failure: done.failure ?? store.state.failure,
	});
	notifyWatchers(store);
	await keep(doors, store);
}
