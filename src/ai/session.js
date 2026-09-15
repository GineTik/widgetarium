import { briefGoesInTheMessage, resumesWithoutAnId } from "./providers.js";
import { withResult } from "./tools.js";

const DRAW_EVERY_MS = 60;
const STOPPED = "Stopped.";
const RESUMES_ITS_OWN_LAST = "last";

function emptyState() {
	return { turns: [], busy: false, failure: null, session: null, tool: null, phase: null, spent: 0, startedAt: 0 };
}

export function createSession({ settings, runner, briefNow }) {
	let state = emptyState();
	let activeRun = null;
	let drawTimer = null;
	const watchers = new Set();

	function notifyWatchers() {
		for (const watch of watchers) watch(state);
	}

	function notifyWatchersSoon() {
		if (drawTimer !== null) return;
		drawTimer = setTimeout(() => {
			drawTimer = null;
			notifyWatchers();
		}, DRAW_EVERY_MS);
	}

	function patchState(patch) {
		state = { ...state, ...patch };
	}

	function intoLastTurn(step) {
		const turns = state.turns.slice();
		const last = turns[turns.length - 1];
		if (!last) return;
		turns[turns.length - 1] = step(last);
		patchState({ turns });
	}

	function keep() {
		return settings.remember({ turns: state.turns, session: state.session });
	}

	function historyForChat() {
		return state.turns
			.filter((turn) => turn.text !== "")
			.map((turn) => ({ role: turn.role === "user" ? "user" : "assistant", text: turn.text }));
	}

	function onEvent(event) {
		if (event.session) patchState({ session: event.session });
		if (event.phase) patchState({ phase: event.phase, ...(event.phase === "tools" ? {} : { tool: null }) });
		if (Number.isFinite(event.spentMore)) patchState({ spent: state.spent + event.spentMore });
		if (Number.isFinite(event.spent)) patchState({ spent: event.spent });
		if (event.call) {
			patchState({ tool: event.call.name, phase: "tools" });
			intoLastTurn((turn) => ({
				...turn,
				calls: [...turn.calls, { ...event.call, answered: false, output: "", failed: false }],
			}));
		}
		if (event.result) intoLastTurn((turn) => ({ ...turn, calls: withResult(turn.calls, event.result) }));
		if (event.text) intoLastTurn((turn) => ({ ...turn, text: turn.text + event.text }));
		if (event.failure) patchState({ failure: event.failure });
		notifyWatchersSoon();
	}

	async function send(said) {
		const asked = String(said ?? "").trim();
		if (asked === "" || state.busy) return;

		const history = historyForChat();
		patchState({
			turns: [...state.turns, { role: "user", text: asked, calls: [] }, { role: "agent", text: "", calls: [] }],
			busy: true,
			failure: null,
			tool: null,
			phase: "thinking",
			spent: 0,
			startedAt: Date.now(),
		});
		notifyWatchers();

		const held = await settings.state();
		const brief = await briefNow();
		const ask = {
			prompt: briefGoesInTheMessage(held.provider) ? `${brief}\n\n---\n\n${asked}` : asked,
			brief,
			history,
			session: state.session,
			skipPermissions: held.skipPermissions,
		};

		activeRun = runner.run(held.provider, ask, onEvent);
		const done = await activeRun.done;
		activeRun = null;
		clearTimeout(drawTimer);
		drawTimer = null;
		// TRADE-OFF: a marker, because a CLI that resumes its own last conversation names no id to carry
		const carried =
			state.session ?? (done.failure === null && resumesWithoutAnId(held.provider) ? RESUMES_ITS_OWN_LAST : null);
		patchState({ busy: false, tool: null, phase: null, session: carried, failure: done.failure ?? state.failure });
		notifyWatchers();
		await keep();
	}

	return {
		now: () => state,

		async restore() {
			if (state.turns.length > 0 || state.busy) return;
			const held = await settings.remembered();
			if (held.turns.length === 0) return;
			patchState({ turns: held.turns, session: held.session });
			notifyWatchers();
		},

		watch(watcher) {
			watchers.add(watcher);
			return () => watchers.delete(watcher);
		},

		send,

		retry() {
			const lastAsked = [...state.turns].reverse().find((turn) => turn.role === "user");
			if (!lastAsked || state.busy) return;
			patchState({ turns: state.turns.slice(0, state.turns.lastIndexOf(lastAsked)), failure: null });
			send(lastAsked.text);
		},

		stop() {
			if (!activeRun) return;
			activeRun.stop();
			patchState({ failure: STOPPED });
			notifyWatchers();
		},

		clear() {
			activeRun?.stop();
			activeRun = null;
			state = emptyState();
			notifyWatchers();
			return keep();
		},
	};
}
