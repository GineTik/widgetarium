const A_MINUTE = 60000;
const A_THOUSAND = 1000;

const PHASE_SAID = {
	thinking: "Thinking",
	tools: "Running tools",
	writing: "Writing",
};

const RUNNING = "Working";

export function saidElapsed(ms) {
	const whole = Math.max(0, Math.floor(ms / 1000));
	if (ms < A_MINUTE) return `${whole}s`;
	return `${Math.floor(whole / 60)}m ${whole % 60}s`;
}

export function saidTokens(spent) {
	if (!Number.isFinite(spent) || spent <= 0) return "";
	if (spent < A_THOUSAND) return `${spent} tokens`;
	return `${(spent / A_THOUSAND).toFixed(1)}k tokens`;
}

export function saidPhase({ phase, tool }) {
	if (phase === "tools" && tool) return `Running ${tool}`;
	return PHASE_SAID[phase] ?? RUNNING;
}

// TRADE-OFF: the parts are joined with a separator rather than authored as one sentence, because a provider that reports no tokens must drop that part without leaving a gap behind it
export function saidProgress({ ms, spent, phase, tool }) {
	return [saidElapsed(ms), saidTokens(spent), saidPhase({ phase, tool })].filter(Boolean).join(" · ");
}
