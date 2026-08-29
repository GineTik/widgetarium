// Off unless asked for: localStorage.setItem("widgetarium-trace", "1")
export function trace(what, detail) {
	try {
		if (localStorage.getItem("widgetarium-trace") !== "1") return;
	} catch {
		return;
	}
	console.log(`[widgetarium] ${what}`, detail);
}
