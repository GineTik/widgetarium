let isTracingAsked = false;

interface SpentRow {
	readonly what: string;
	readonly calls: number;
	readonly totalMs: number;
	readonly worstMs: number;
	readonly eachMs: number;
}

interface Spent {
	readonly calls: number;
	readonly ms: number;
	readonly worstMs: number;
}

const spent = new Map<string, Spent>();

export function setTracing(on: unknown): boolean {
	isTracingAsked = on === true;
	return isTracingAsked;
}

export function tracing(): boolean {
	if (isTracingAsked) return true;
	try {
		return localStorage.getItem("widgetarium-trace") === "1";
	} catch {
		return false;
	}
}

export function trace(what: string, detail?: unknown): void {
	if (!tracing()) return;
	console.log(`[widgetarium] ${what}`, detail);
}

export function measure<Answer>(what: string, run: () => Promise<Answer>): Promise<Answer>;
export function measure<Answer>(what: string, run: () => Answer): Answer;
// TRADE-OFF: always on, because the thing being hunted only happens in the real app and asking for it first means never catching it; a Map bump per call is the price
export function measure(what: string, run: () => unknown): unknown {
	const at = performance.now();
	const done = (): void => record(what, at);
	try {
		return timeAnswer(run(), done);
	} catch (failure) {
		done();
		throw failure;
	}
}

export function spentSoFar(): SpentRow[] {
	return [...spent.entries()]
		.map(([what, held]) => ({
			what,
			calls: held.calls,
			totalMs: Math.round(held.ms),
			worstMs: Math.round(held.worstMs),
			eachMs: Number((held.ms / held.calls).toFixed(2)),
		}))
		.sort((one, other) => other.totalMs - one.totalMs);
}

export function forgetSpent(): void {
	spent.clear();
}

// TRADE-OFF: detail may be a thunk — off, nothing is computed and nothing is allocated
export function traceSub(what: string, detail?: unknown): void {
	if (!tracing()) return;
	try {
		console.log(`[widgetarium:sub] ${what}`, isThunk(detail) ? detail() : detail);
	} catch (failure) {
		console.log(`[widgetarium:sub] ${what}`, { unreadable: String(failure) });
	}
}

function record(what: string, at: number): void {
	const held = spent.get(what) ?? { calls: 0, ms: 0, worstMs: 0 };
	const took = performance.now() - at;
	spent.set(what, { calls: held.calls + 1, ms: held.ms + took, worstMs: Math.max(held.worstMs, took) });
}

function timeAnswer(answer: unknown, done: () => void): unknown {
	if (!isThenable(answer)) {
		done();
		return answer;
	}
	return answer.then(
		(held) => {
			done();
			return held;
		},
		(failure: unknown) => {
			done();
			throw failure;
		},
	);
}

function isThunk(detail: unknown): detail is () => unknown {
	return typeof detail === "function";
}

function isThenable(answer: unknown): answer is PromiseLike<unknown> {
	if (typeof answer !== "object" && typeof answer !== "function") return false;
	return answer !== null && typeof Reflect.get(answer, "then") === "function";
}
