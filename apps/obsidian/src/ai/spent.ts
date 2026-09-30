import type { Phase } from "./stream.js";

export interface PhaseSeen {
	readonly phase: Phase | null;
	readonly tool: string | null;
}

export interface ProgressSeen extends PhaseSeen {
	readonly ms: number;
	readonly spent: number;
}

const A_MINUTE = 60000;
const A_THOUSAND = 1000;

const PHASE_SAID: Readonly<Record<Phase, string>> = {
	thinking: "Thinking",
	tools: "Running tools",
	writing: "Writing",
};

const RUNNING = "Working";

export function saidElapsed(ms: number): string {
	const whole = Math.max(0, Math.floor(ms / 1000));
	if (ms < A_MINUTE) return `${whole}s`;
	return `${Math.floor(whole / 60)}m ${whole % 60}s`;
}

export function saidTokens(spent: number): string {
	if (!Number.isFinite(spent) || spent <= 0) return "";
	if (spent < A_THOUSAND) return `${spent} tokens`;
	return `${(spent / A_THOUSAND).toFixed(1)}k tokens`;
}

export function saidPhase({ phase, tool }: PhaseSeen): string {
	if (phase === "tools" && tool) return `Running ${tool}`;
	return (phase ? PHASE_SAID[phase] : undefined) ?? RUNNING;
}

// TRADE-OFF: the parts are joined with a separator rather than authored as one sentence, because a provider that reports no tokens must drop that part without leaving a gap behind it
export function saidProgress({ ms, spent, phase, tool }: ProgressSeen): string {
	return [saidElapsed(ms), saidTokens(spent), saidPhase({ phase, tool })].filter(Boolean).join(" · ");
}
