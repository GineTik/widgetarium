// CONTEXT: off unless asked for — app.plugins.plugins.widgetarium.logging = true
let asked = false;

export function setTracing(on) {
	asked = on === true;
	return asked;
}

// CONTEXT: the one place that decides; no caller keeps a flag of its own
export function tracing() {
	if (asked) return true;
	try {
		return localStorage.getItem("widgetarium-trace") === "1";
	} catch {
		return false;
	}
}

export function trace(what, detail) {
	if (!tracing()) return;
	console.log(`[widgetarium] ${what}`, detail);
}

const spent = new Map();

function record(what, at) {
	const held = spent.get(what) ?? { calls: 0, ms: 0, worstMs: 0 };
	const took = performance.now() - at;
	spent.set(what, { calls: held.calls + 1, ms: held.ms + took, worstMs: Math.max(held.worstMs, took) });
}

function timed(answer, done) {
	if (typeof answer?.then !== "function") {
		done();
		return answer;
	}
	return answer.then(
		(held) => {
			done();
			return held;
		},
		(failure) => {
			done();
			throw failure;
		},
	);
}

// TRADE-OFF: always on, because the thing being hunted only happens in the real app and asking for it first means never catching it; a Map bump per call is the price
export function measure(what, run) {
	const at = performance.now();
	const done = () => record(what, at);
	try {
		return timed(run(), done);
	} catch (failure) {
		done();
		throw failure;
	}
}

export function spentSoFar() {
	return [...spent.entries()]
		.map(([what, held]) => ({ what, calls: held.calls, totalMs: Math.round(held.ms), worstMs: Math.round(held.worstMs), eachMs: Number((held.ms / held.calls).toFixed(2)) }))
		.sort((one, other) => other.totalMs - one.totalMs);
}

export function forgetSpent() {
	spent.clear();
}

// CONTEXT: its own tag, so the console filters to the substitution path alone
// TRADE-OFF: detail may be a thunk — off, nothing is computed and nothing is allocated
export function traceSub(what, detail) {
	if (!tracing()) return;
	try {
		console.log(`[widgetarium:sub] ${what}`, typeof detail === "function" ? detail() : detail);
	} catch (failure) {
		console.log(`[widgetarium:sub] ${what}`, { unreadable: String(failure) });
	}
}
