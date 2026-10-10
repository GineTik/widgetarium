import type { AssistantCall, AssistantSession } from "@widgetarium/core/engine/assistant-port.js";
import type {
	Build,
	BuildRunCard,
	ChatCards,
	PinnedCard,
	TurnCards,
} from "@widgetarium/core/engine/assistant-cards.js";
import { buildsIn } from "./builds.js";
import { buildRunIn, buildSpanOf, buildStartedIn, installsIn, lastDesignAppIn, lastSpecAppIn } from "./spec-calls.js";
import type { BuildSpan } from "./spec-calls.js";

interface HeldCalls {
	readonly calls: AssistantCall[];
	readonly builds: Build[];
}

interface SessionBuilds {
	readonly session: AssistantSession;
	readonly ofTurns: readonly Build[][];
}

export const BUILD_IT = "Build it";
export const APPROVE_DESIGN = "Approve design";

export function chatCardsOf(session: AssistantSession): ChatCards {
	const lastAt = session.turns.length - 1;
	const held: SessionBuilds = {
		session,
		ofTurns: session.turns.map((turn, at) => buildsIn(turn.calls, session.busy && at === lastAt)),
	};
	return { ofTurns: session.turns.map((_turn, at) => turnCardsOf(held, at)), pinned: pinnedOf(held) };
}

function turnCardsOf(held: SessionBuilds, at: number): TurnCards {
	const calls = held.session.turns[at]?.calls ?? [];
	return { build: buildCardOf(held, at), specApp: lastSpecAppIn(calls), designApp: lastDesignAppIn(calls) };
}

function buildCardOf(held: SessionBuilds, at: number): BuildRunCard | null {
	const { session } = held;
	const lastAt = session.turns.length - 1;
	const span = buildSpanOf(session.turns, at, BUILD_IT);
	if (span && span.startAt !== at) return null;
	const { calls, builds } = heldCallsOf(held, at, span);
	const isRunning = session.busy && (span ? span.endAt : at) === lastAt;
	const run = buildRunIn(calls, isRunning, span ? buildStartedIn(session.turns, at, BUILD_IT) : null);
	return run ? { run, builds, installs: installsIn(calls), isRunning } : null;
}

function heldCallsOf(held: SessionBuilds, at: number, span: BuildSpan | null): HeldCalls {
	if (span) return spanOf(held, span);
	return { calls: held.session.turns[at]?.calls ?? [], builds: held.ofTurns[at] ?? [] };
}

function spanOf({ session, ofTurns }: SessionBuilds, span: BuildSpan): HeldCalls {
	const turns = session.turns.slice(span.startAt, span.endAt + 1);
	const builds = ofTurns.slice(span.startAt, span.endAt + 1).flat();
	return { calls: turns.flatMap((turn) => turn.calls), builds };
}

function pinnedOf(held: SessionBuilds): PinnedCard | null {
	const { session, ofTurns } = held;
	const lastAt = session.turns.length - 1;
	const last = session.turns[lastAt];
	const span = buildSpanOf(session.turns, lastAt, BUILD_IT);
	const { calls, builds } = heldCallsOf(held, lastAt, span);
	const startedFor = span ? buildStartedIn(session.turns, span.startAt, BUILD_IT) : null;
	const run = session.busy && last ? buildRunIn(calls, true, startedFor) : null;
	if (run) return { kind: "run", run, builds };
	const live = ofTurns[lastAt]?.find((build) => build.isLive);
	return live ? { kind: "build", build: live } : null;
}
