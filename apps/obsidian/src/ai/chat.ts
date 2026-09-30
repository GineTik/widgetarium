import { createElement as h, useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement, RefObject } from "react";
import { Button } from "@widgetarium/kit";
import { buildsIn } from "./builds.js";
import type { Build } from "./builds.js";
import { BuildProgress } from "./build-progress.js";
import type { OpenByBuild } from "./build-progress.js";
import type { AssistantState } from "./assistant.js";
import type { Session, SessionState } from "./session.js";
import { Turn } from "./turn.js";
import { EmptyChat } from "./empty-chat.js";
import { ProviderMenu } from "./provider-menu.js";
import { Working } from "./working.js";
import { Composer } from "./composer.js";

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

const TITLE = "Widgetarium AI";
const RETRY = "Try again";

export function AiChat({ session, ai, onChoose, onOpenProviders }: AiChatProps): ReactElement {
	const state = useSessionState(session);
	const scroller = useScrolledToEnd(state);
	const builds = useBuilds(state);

	return h("div", { className: "wg-ai" }, [
		h("header", { className: "wg-ai-head", key: "head" }, [
			h("span", { className: "wg-ai-title", key: "title" }, TITLE),
			h("span", { className: "wg-ai-who", key: "who" }, ai.provider.label),
			h(ProviderMenu, { key: "menu", ai, onChoose, onOpenProviders, onClear: () => void session.clear() }),
		]),
		h(
			"div",
			{ className: "wg-ai-scroll", key: "scroll", ref: scroller },
			state.turns.length === 0
				? h(EmptyChat, { key: "empty", ai, onOpenProviders })
				: [
						...state.turns.flatMap((turn, at) => [
							h(Turn, { key: at, turn, host: ai.host, live: state.busy && at === state.turns.length - 1 }),
							...(builds.ofTurns[at] ?? [])
								.filter((build) => !build.isLive)
								.map((build) =>
									h(BuildProgress, { key: build.key, build, progress: ai.progress, openByBuild: builds.openByBuild }),
								),
						]),
						state.busy ? h(Working, { key: "busy", state }) : null,
						state.failure
							? h("div", { className: "wg-ai-failure", key: "failure" }, [
									h("span", { className: "wg-ai-failure-said", key: "said" }, state.failure),
									h(Button, { key: "retry", variant: "neutral", size: "s", onClick: () => session.retry() }, RETRY),
								])
							: null,
					],
		),
		builds.pinned
			? h(
					"div",
					{ className: "wg-ai-pinned", key: "pinned" },
					h(BuildProgress, {
						key: builds.pinned.key,
						build: builds.pinned,
						progress: ai.progress,
						openByBuild: builds.openByBuild,
					}),
				)
			: null,
		h(Composer, {
			key: "composer",
			busy: state.busy,
			note: ai.note,
			onSend: (said) => void session.send(said),
			onStop: () => session.stop(),
		}),
	]);
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
