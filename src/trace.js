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
