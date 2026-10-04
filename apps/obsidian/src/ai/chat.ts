import { createElement as h, useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement, ReactNode, RefObject } from "react";
import { Button } from "@widgetarium/kit";
import { buildsIn } from "./builds.js";
import type { Build } from "./builds.js";
import { BuildProgress } from "./build-progress.js";
import type { OpenByBuild } from "./build-progress.js";
import type { AssistantState } from "./assistant.js";
import type { Session, SessionState } from "./session.js";
import type { KeptCall, KeptTurn } from "./transcript.js";
import { Turn } from "./turn.js";
import { EmptyChat } from "./empty-chat.js";
import { ProviderMenu } from "./provider-menu.js";
import { Working } from "./working.js";
import { Composer } from "./composer.js";
import { SpecCard } from "./spec-card.js";
import { BuildRunCard } from "./build-run-card.js";
import { PinnedRun } from "./pinned-run.js";
import { buildRunIn, installsIn, lastSpecAppIn } from "./spec-calls.js";
import { specPathOf } from "@widgetarium/core/app-spec.js";

export { sendState } from "./composer.js";

export interface AiChatProps {
	readonly session: Session;
	readonly ai: AssistantState;
	readonly onChoose: (id: string) => void;
	readonly onOpenProviders: () => void;
}

interface ChatBuilds {
	readonly openByBuild: OpenByBuild;
	readonly ofTurns: Build[][];
	readonly pinned: Build | null;
}

interface TurnDraw {
	readonly state: SessionState;
	readonly ai: AssistantState;
	readonly builds: ChatBuilds;
	readonly onBuild: () => void;
	readonly onChange: (app: string) => void;
}

const TITLE = "Widgetarium AI";
const RETRY = "Try again";
const BUILD_IT = "Build it";
const CHANGING = "Changing the {app} spec";
const CHANGE_ASKED = "Change the spec at {path} as follows: {said}\nThen show the spec again.";

export function AiChat({ session, ai, onChoose, onOpenProviders }: AiChatProps): ReactElement {
	const state = useSessionState(session);
	const scroller = useScrolledToEnd(state);
	const builds = useBuilds(state);
	const [changing, setChanging] = useState<string | null>(null);
	const onBuild = (): void => {
		setChanging(null);
		void session.send(BUILD_IT);
	};
	const draw: TurnDraw = { state, ai, builds, onBuild, onChange: setChanging };
	const menu = { ai, onChoose, onOpenProviders, onClear: () => void session.clear() };
	return h("div", { className: "wg-ai" }, [
		h("header", { className: "wg-ai-head", key: "head" }, [
			h("span", { className: "wg-ai-title", key: "title" }, TITLE),
			h("span", { className: "wg-ai-who", key: "who" }, ai.provider.label),
			h(ProviderMenu, { key: "menu", ...menu }),
		]),
		h("div", { className: "wg-ai-scroll", key: "scroll", ref: scroller }, scrollOf(session, draw, onOpenProviders)),
		pinnedOf(draw),
		composerOf(session, draw, { changing, setChanging }),
	]);
}

interface Changing {
	readonly changing: string | null;
	readonly setChanging: (app: string | null) => void;
}

function composerOf(session: Session, { state, ai }: TurnDraw, { changing, setChanging }: Changing): ReactElement {
	const onSend = (said: string): void => {
		const asked = changing ? CHANGE_ASKED.replace("{path}", specPathOf(changing)).replace("{said}", said) : said;
		setChanging(null);
		void session.send(asked);
	};
	const attached = changing ? { label: CHANGING.replace("{app}", changing), onClear: () => setChanging(null) } : null;
	const onStop = (): void => session.stop();
	return h(Composer, { key: "composer", busy: state.busy, note: ai.note, attached, onSend, onStop });
}

function scrollOf(session: Session, draw: TurnDraw, onOpenProviders: () => void): ReactNode {
	const { state, ai } = draw;
	if (state.turns.length === 0) return h(EmptyChat, { key: "empty", ai, onOpenProviders });
	return [
		...state.turns.flatMap((turn, at) => turnElements(turn, at, draw)),
		state.busy ? h(Working, { key: "busy", state }) : null,
		state.failure
			? h("div", { className: "wg-ai-failure", key: "failure" }, [
					h("span", { className: "wg-ai-failure-said", key: "said" }, state.failure),
					h(Button, { key: "retry", variant: "neutral", size: "s", onClick: () => session.retry() }, RETRY),
				])
			: null,
	];
}

function turnElements(turn: KeptTurn, at: number, draw: TurnDraw): ReactNode[] {
	const { state, ai, builds } = draw;
	const lastAt = state.turns.length - 1;
	const isRunning = state.busy && at === lastAt;
	const widgetBuilds = builds.ofTurns[at] ?? [];
	const run = buildRunIn(turn.calls, isRunning);
	return [
		h(Turn, { key: at, turn, host: ai.host, live: isRunning }),
		...specCardsOf(turn.calls, at, draw, at === lastAt && !state.busy),
		run
			? h(BuildRunCard, { key: run.key, run, port: ai.specs, builds: widgetBuilds, installs: installsIn(turn.calls) })
			: null,
	];
}

function buildProgressOf(build: Build, { ai, builds }: TurnDraw): ReactElement {
	return h(BuildProgress, { key: build.key, build, progress: ai.progress, openByBuild: builds.openByBuild });
}

function pinnedOf(draw: TurnDraw): ReactElement | null {
	const { state, builds } = draw;
	const lastAt = state.turns.length - 1;
	const last = state.turns[lastAt];
	const run = state.busy && last ? buildRunIn(last.calls, true) : null;
	const pinned = run ? h(PinnedRun, { run, builds: builds.ofTurns[lastAt] ?? [] }) : null;
	const shown = pinned ?? (builds.pinned ? buildProgressOf(builds.pinned, draw) : null);
	return shown ? h("div", { className: "wg-ai-pinned", key: "pinned" }, shown) : null;
}

function specCardsOf(
	calls: readonly KeptCall[],
	turnAt: number,
	draw: TurnDraw,
	isAnswerable: boolean,
): ReactElement[] {
	const app = lastSpecAppIn(calls);
	if (!app) return [];
	return [
		h(SpecCard, {
			key: `spec-${turnAt}-${app}`,
			app,
			port: draw.ai.specs,
			isAnswerable,
			onBuild: draw.onBuild,
			onChange: () => draw.onChange(app),
		}),
	];
}

function useSessionState(session: Session): SessionState {
	const [state, setState] = useState(() => session.now());
	useEffect(() => session.watch(setState), [session]);
	return state;
}

function useScrolledToEnd(state: SessionState): RefObject<HTMLDivElement | null> {
	const scroller = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const node = scroller.current;
		if (node) node.scrollTop = node.scrollHeight;
	}, [state.turns, state.busy]);
	return scroller;
}

function useBuilds(state: SessionState): ChatBuilds {
	const openByBuild = useMemo<OpenByBuild>(() => new Map(), []);
	const lastAt = state.turns.length - 1;
	const ofTurns = state.turns.map((turn, at) => buildsIn(turn.calls, state.busy && at === lastAt));
	return { openByBuild, ofTurns, pinned: ofTurns[lastAt]?.find((build) => build.isLive) ?? null };
}
