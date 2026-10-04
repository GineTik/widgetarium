import { createElement as h, useEffect, useMemo, useState } from "react";
import type { ReactElement, ReactNode, ComponentProps } from "react";
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
import { buildRunIn, buildSpanOf, buildStartedIn, installsIn, lastDesignAppIn, lastSpecAppIn } from "./spec-calls.js";
import type { BuildSpan } from "./spec-calls.js";
import { DesignCard } from "./design-card.js";
import { ToEndButton, useStuckToEnd } from "./stuck-scroll.js";
import { designPathOf } from "@widgetarium/core/app-design.js";
import { specPathOf } from "@widgetarium/core/app-spec.js";

export { sendState } from "./composer.js";

export interface AiChatProps {
	readonly session: Session;
	readonly ai: AssistantState;
	readonly onChoose: (id: string) => void;
	readonly onOpenProviders: () => void;
	readonly onHelperAgents: (on: boolean) => void;
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
	readonly onChange: (changing: Changed) => void;
	readonly onApproveDesign: () => void;
}

type Changed = { readonly app: string; readonly what: "spec" | "design" };

const TITLE = "Widgetarium AI";
const RETRY = "Try again";
const BUILD_IT = "Build it";
const APPROVE_DESIGN = "Approve design";
const CHANGING = "Changing the {app} {what}";
const CHANGE_ASKED = "Change the {what} at {path} as follows: {said}\nThen show the {what} again.";

export function AiChat({ session, ai, onChoose, onOpenProviders, onHelperAgents }: AiChatProps): ReactElement {
	const state = useSessionState(session);
	const { scroller, isStuck, onScroll, toEnd } = useStuckToEnd([state.turns, state.busy]);
	const { draw, changing, setChanging } = useTurnDraw(session, state, ai);
	const menu = { ai, onChoose, onOpenProviders, onHelperAgents, onClear: () => void session.clear() };
	return h("div", { className: "wg-ai" }, [
		chatHead(ai, menu),
		h("div", { className: "wg-ai-scroll-frame", key: "scroll" }, [
			h(
				"div",
				{ className: "wg-ai-scroll", key: "scroll", ref: scroller, onScroll },
				scrollOf(session, draw, onOpenProviders),
			),
			isStuck ? null : h(ToEndButton, { key: "end", toEnd }),
		]),
		pinnedOf(draw),
		composerOf(session, draw, { changing, setChanging }),
	]);
}

function chatHead(ai: AssistantState, menu: ComponentProps<typeof ProviderMenu>): ReactElement {
	return h("header", { className: "wg-ai-head", key: "head" }, [
		h("span", { className: "wg-ai-title", key: "title" }, TITLE),
		h("span", { className: "wg-ai-who", key: "who" }, ai.provider.label),
		h(ProviderMenu, { key: "menu", ...menu }),
	]);
}

interface Changing {
	readonly changing: Changed | null;
	readonly setChanging: (changing: Changed | null) => void;
}

function composerOf(session: Session, { state, ai }: TurnDraw, { changing, setChanging }: Changing): ReactElement {
	const onSend = (said: string): void => {
		const asked = changing ? changeAsked(changing, said) : said;
		setChanging(null);
		void session.send(asked);
	};
	const attached = changing
		? {
				label: CHANGING.replace("{app}", changing.app).replace("{what}", changing.what),
				onClear: () => setChanging(null),
			}
		: null;
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

function useTurnDraw(session: Session, state: SessionState, ai: AssistantState) {
	const builds = useBuilds(state);
	const [changing, setChanging] = useState<Changed | null>(null);
	const send = (said: string) => (): void => {
		setChanging(null);
		void session.send(said);
	};
	const draw: TurnDraw = {
		state,
		ai,
		builds,
		onBuild: send(BUILD_IT),
		onChange: setChanging,
		onApproveDesign: send(APPROVE_DESIGN),
	};
	return { draw, changing, setChanging };
}

function turnElements(turn: KeptTurn, at: number, draw: TurnDraw): ReactNode[] {
	const { state, ai } = draw;
	const lastAt = state.turns.length - 1;
	const isRunning = state.busy && at === lastAt;
	return [
		buildCardOf(turn, at, draw, isRunning),
		h(Turn, { key: at, turn, host: ai.host, live: isRunning }),
		...specCardsOf(turn.calls, at, draw, at === lastAt && !state.busy),
		...designCardsOf(turn.calls, at, draw, at === lastAt && !state.busy),
	];
}

function buildCardOf(turn: KeptTurn, at: number, draw: TurnDraw, isRunning: boolean): ReactElement | null {
	const span = buildSpanOf(draw.state.turns, at, BUILD_IT);
	if (span && span.startAt !== at) return null;
	const { calls, builds } = span ? spanOf(draw, span) : { calls: turn.calls, builds: draw.builds.ofTurns[at] ?? [] };
	const isSpanRunning = span ? draw.state.busy && span.endAt === draw.state.turns.length - 1 : isRunning;
	const run = buildRunIn(calls, isSpanRunning, span ? buildStartedIn(draw.state.turns, at, BUILD_IT) : null);
	if (!run) return null;
	const card = { run, port: draw.ai.specs, builds, installs: installsIn(calls), isRunning: isSpanRunning };
	return h(BuildRunCard, { key: `${run.key}-${at}`, ...card });
}

function spanOf({ state, builds }: TurnDraw, span: BuildSpan): { calls: KeptCall[]; builds: Build[] } {
	const turns = state.turns.slice(span.startAt, span.endAt + 1);
	const held = Array.from(
		{ length: span.endAt - span.startAt + 1 },
		(_unused, index) => builds.ofTurns[span.startAt + index] ?? [],
	);
	return { calls: turns.flatMap((turn) => turn.calls), builds: held.flat() };
}

function buildProgressOf(build: Build, { ai, builds }: TurnDraw): ReactElement {
	return h(BuildProgress, { key: build.key, build, progress: ai.progress, openByBuild: builds.openByBuild });
}

function pinnedOf(draw: TurnDraw): ReactElement | null {
	const { state, builds } = draw;
	const lastAt = state.turns.length - 1;
	const last = state.turns[lastAt];
	const span = buildSpanOf(state.turns, lastAt, BUILD_IT);
	const held = span ? spanOf(draw, span) : { calls: last?.calls ?? [], builds: builds.ofTurns[lastAt] ?? [] };
	const startedFor = span ? buildStartedIn(state.turns, span.startAt, BUILD_IT) : null;
	const run = state.busy && last ? buildRunIn(held.calls, true, startedFor) : null;
	const pinned = run ? h(PinnedRun, { run, builds: held.builds }) : null;
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
			onChange: () => draw.onChange({ app, what: "spec" }),
		}),
	];
}

function designCardsOf(
	calls: readonly KeptCall[],
	turnAt: number,
	draw: TurnDraw,
	isAnswerable: boolean,
): ReactElement[] {
	const app = lastDesignAppIn(calls);
	if (!app) return [];
	return [
		h(DesignCard, {
			key: `design-${turnAt}-${app}`,
			app,
			port: draw.ai.specs,
			isAnswerable,
			onOpen: () => draw.ai.openDesign(app),
			onApprove: draw.onApproveDesign,
			onChange: () => draw.onChange({ app, what: "design" }),
		}),
	];
}

function changeAsked(changing: Changed, said: string): string {
	const path = changing.what === "spec" ? specPathOf(changing.app) : designPathOf(changing.app);
	return CHANGE_ASKED.replaceAll("{what}", changing.what).replace("{path}", path).replace("{said}", said);
}

function useSessionState(session: Session): SessionState {
	const [state, setState] = useState(() => session.now());
	useEffect(() => session.watch(setState), [session]);
	return state;
}

function useBuilds(state: SessionState): ChatBuilds {
	const openByBuild = useMemo<OpenByBuild>(() => new Map(), []);
	const lastAt = state.turns.length - 1;
	const ofTurns = state.turns.map((turn, at) => buildsIn(turn.calls, state.busy && at === lastAt));
	return { openByBuild, ofTurns, pinned: ofTurns[lastAt]?.find((build) => build.isLive) ?? null };
}
