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
	stage.innerHTML = filled(repeated(stage.innerHTML, values), values);
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

const A_LOOP = /<sc-for\s+list="\{\{\s*(\w+)\s*\}\}"\s+as="(\w+)"[^>]*>([\s\S]*?)<\/sc-for>/g;

function repeated(markup, values) {
	return markup.replace(A_LOOP, (whole, name, alias, body) => {
		const rows = values[name];
		if (!Array.isArray(rows)) return whole;
		return rows.map((row) => rowFilled(body, alias, row)).join("");
	});
}

function rowFilled(markup, alias, row) {
	const named = new RegExp(`\\{\\{\\s*${alias}\\.(\\w+)\\s*\\}\\}`, "g");
	return markup.replace(named, (whole, key) => (key in row ? String(row[key]) : whole));
}
