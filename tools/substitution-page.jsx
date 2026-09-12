import { createElement as h } from "react";
import { render } from "../src/engine/render.js";
import { useEffect, useState } from "react";
import { SubstitutionDialog } from "../src/substitution-dialog.js";
import { WidgetRegistry } from "../src/registry.js";
import { normalizeRules } from "../src/substitution.js";

const FILES = window.__FILES__;

const adapter = {
	async exists(path) {
		return Object.hasOwn(FILES, path) || Object.keys(FILES).some((key) => key.startsWith(`${path}/`));
	},
	async list(path) {
		const files = [];
		const folders = new Set();
		for (const key of Object.keys(FILES)) {
			if (!key.startsWith(`${path}/`)) continue;
			const rest = key.slice(path.length + 1);
			const cut = rest.indexOf("/");
			if (cut === -1) files.push(key);
			else folders.add(`${path}/${rest.slice(0, cut)}`);
		}
		return { files, folders: [...folders] };
	},
	async read(path) {
		return FILES[path];
	},
};

const CODE = { id: "sub-0", name: "Code", mode: "line", open: "!code", widget: "@inline/code-block" };
const REMINDER = { id: "sub-1", name: "Reminder", mode: "line", open: "!", widget: "@inline/reminder" };
const NOTE = {
	id: "sub-2",
	name: "Note",
	mode: "wrapped",
	open: ":::",
	close: ":::",
	widget: "@inline/note",
	enabled: false,
};
const TIMECODE = {
	id: "sub-3",
	name: "Timecode",
	mode: "regex",
	pattern: "^@(\\d{1,2}:\\d{2})\\s+(.+)$",
	widget: "@inline/reminder",
	draft: true,
};
const BROKEN = { id: "sub-4", name: "Timecode", mode: "regex", pattern: "", widget: "@inline/reminder", draft: true };

const CASES = {
	live: [CODE, REMINDER, NOTE, TIMECODE],
	draft: [{ ...REMINDER, draft: true }, CODE, NOTE, TIMECODE],
	off: [{ ...NOTE, enabled: false, draft: false }, CODE, REMINDER, TIMECODE],
	invalid: [BROKEN, CODE, REMINDER, NOTE],
	empty: [],
};

function Harness() {
	const [registry, setRegistry] = useState(null);
	const [rules, setRules] = useState(normalizeRules(CASES[askedCase()] ?? CASES.live));

	useEffect(() => {
		const loading = new WidgetRegistry({ vault: { adapter } });
		loading.load().then(() => setRegistry(loading));
	}, []);

	if (!registry) return h("p", null, "Loading widgets…");
	return h(SubstitutionDialog, { rules, registry, host: null, onChange: setRules, onClose: () => {} });
}

function askedCase() {
	return new URLSearchParams(window.location.search).get("case") ?? "live";
}

function pressListOpen() {
	const button = document.querySelector(".wg-sub-open");
	if (button) button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

render(h(Harness), document.getElementById("host"));

if (new URLSearchParams(window.location.search).get("open") === "list") setTimeout(pressListOpen, 900);
