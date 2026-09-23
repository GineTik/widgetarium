class DCLogic {
	constructor(props) {
		this.props = props ?? {};
	}

	renderVals() {
		return {};
	}
}

window.DCLogic = DCLogic;
window.__err = "";
addEventListener("error", (event) => {
	window.__err += `${event.message} @ ${event.filename ?? "?"}:${event.lineno ?? 0}\n`;
});

addEventListener("DOMContentLoaded", () => {
	const holder = document.querySelector("script[data-dc-script]");
	const asked = window.__PROPS__ ?? {};
	const made = new Component({ ...defaultsIn(holder), ...asked });
	const values = made.renderVals();
	const stage = document.querySelector("x-dc");
	for (const style of stage.querySelectorAll("helmet > style")) document.head.appendChild(style);
	stage.querySelector("helmet")?.remove();
	stage.innerHTML = filled(stage.innerHTML, values);
	window.__READY__ = true;
});

function defaultsIn(holder) {
	const declared = JSON.parse(holder?.dataset.props ?? "{}");
	const out = {};
	for (const [name, spec] of Object.entries(declared)) {
		if (spec && typeof spec === "object" && "default" in spec) out[name] = spec.default;
	}
	return out;
}

function filled(markup, values) {
	return markup.replace(/\{\{\s*(\w+)\s*\}\}/g, (whole, name) => (name in values ? String(values[name]) : whole));
}
